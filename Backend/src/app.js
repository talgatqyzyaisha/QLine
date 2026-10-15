import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AppError, bookingInput } from '../../shared/domain.js';
import { loadConfig } from './config.js';
import { createSupabaseClient } from './supabase.js';
import { createAuthService, passwordValid, recoveryProof, verifyRecovery, safeReturn } from './auth.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export function createApp({ env = process.env, client: suppliedClient, config: suppliedConfig } = {}) {
  const config = suppliedConfig || loadConfig(env);
  const client = suppliedClient || createSupabaseClient(config);
  const auth = createAuthService(client, config);
  const app = express();
  const prefix = config.production ? '__Host-ql_' : 'ql_';
  const names = { access: prefix + 'access', refresh: prefix + 'refresh', recovery: prefix + 'recovery', redirect: prefix + 'return' };
  const cookie = { httpOnly: true, secure: config.production, sameSite: 'lax', path: '/' };
  const clearSession = res => Object.values(names).forEach(name => res.clearCookie(name, cookie));
  const setSession = (res, session) => {
    if (!session?.access_token || !session?.refresh_token || !Number.isFinite(session.expires_in)) throw new AppError('SERVER', 502);
    res.cookie(names.access, session.access_token, { ...cookie, maxAge: Math.min(session.expires_in, 86400) * 1000 });
    res.cookie(names.refresh, session.refresh_token, { ...cookie, maxAge: 30 * 86400000 });
  };

  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', 1);
  app.use(helmet({
    contentSecurityPolicy: { directives: {
      defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'], imgSrc: ["'self'", config.url, 'data:'],
      connectSrc: ["'self'"], objectSrc: ["'none'"], baseUri: ["'self'"], frameAncestors: ["'none'"],
      ...(config.production ? {} : { upgradeInsecureRequests: null })
    } },
    referrerPolicy: { policy: 'no-referrer' },
    ...(config.production ? {} : { strictTransportSecurity: false })
  }));
  app.use(express.json({ limit: '16kb' }));
  app.use(cookieParser());
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      if (req.get('Origin') !== config.origin) return res.status(403).json({ code: 'FORBIDDEN' });
      if (!req.is('application/json')) return res.status(415).json({ code: 'INVALID' });
    }
    next();
  });
  app.use('/api', rateLimit({ windowMs: 60000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false, message: { code: 'RATE_LIMITED' } }));
  const authLimiter = rateLimit({ windowMs: 15 * 60000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false, message: { code: 'RATE_LIMITED' } });

  app.get('/api/health', (req, res) => res.json({ ok: true }));
  app.get('/api/ready', async (req, res) => {
    await client.rpc(undefined, 'GET', '/services');
    res.json({ ok: true, storage: 'supabase' });
  });
  app.get('/runtime-config.js', (req, res) => res.type('application/javascript').set('Cache-Control', 'no-store').send('window.Q_CONFIG=' + JSON.stringify({
    mode: 'supabase', smsEnabled: config.smsEnabled, registrationEnabled: config.legalReady,
    bookingEnabled: config.legalReady, legalApproved: config.legalReady, storageOrigin: config.url
  }) + ';'));

  app.post('/api/auth/signup', authLimiter, async (req, res) => {
    const session = await auth.signUp(req.body);
    res.cookie(names.redirect, safeReturn(req.body.return_path), { ...cookie, maxAge: 86400000 });
    if (session.access_token) {
      setSession(res, session);
      return res.status(201).json({ authenticated: true });
    }
    // Same result for an existing address and a newly created unconfirmed account.
    res.status(202).json({ authenticated: false, confirmationRequired: true });
  });
  app.post('/api/auth/login', authLimiter, async (req, res) => {
    const session = await auth.signIn(req.body);
    res.clearCookie(names.recovery, cookie);
    setSession(res, session);
    res.json({ authenticated: true });
  });
  app.post('/api/auth/recover', authLimiter, async (req, res) => res.json(await auth.recover(req.body)));
  app.post('/api/auth/confirm', authLimiter, async (req, res) => {
    const session = await auth.verify(req.body);
    if (!session.user?.id) throw new AppError('AUTH_LINK_INVALID', 400);
    setSession(res, session);
    res.clearCookie(names.recovery, cookie);
    if (req.body.type === 'recovery') res.cookie(names.recovery, recoveryProof(config.sessionSecret, session.user.id, session.access_token), { ...cookie, maxAge: 10 * 60000 });
    const returnTo = safeReturn(req.cookies[names.redirect]);
    res.clearCookie(names.redirect, cookie);
    res.json({ authenticated: true, recovery: req.body.type === 'recovery', returnTo });
  });
  app.post('/api/auth/send-code', authLimiter, async (req, res) => res.json(await auth.sendPhoneCode(req.body)));
  app.post('/api/auth/verify', authLimiter, async (req, res) => {
    const session = await auth.verifyPhone(req.body);
    res.clearCookie(names.recovery, cookie);
    setSession(res, session);
    res.json({ authenticated: true });
  });

  app.use('/api', async (req, res, next) => {
    req.access = req.cookies[names.access];
    if (req.access) {
      try { req.identity = await client.request('/auth/v1/user', { token: req.access }); }
      catch (error) { if (error.code !== 'UNAUTHORIZED') throw error; req.access = null; }
    }
    if (!req.access && req.cookies[names.refresh]) {
      try {
        const session = await auth.refresh(req.cookies[names.refresh]);
        req.access = session.access_token;
        // Always verify current identity after refresh, even if provider returns a user.
        req.identity = await client.request('/auth/v1/user', { token: req.access });
        setSession(res, session);
      } catch (error) {
        if (!['UNAUTHORIZED', 'INVALID'].includes(error.code)) throw error;
        clearSession(res); req.access = null; req.identity = null;
      }
    }
    next();
  });
  app.post('/api/auth/logout', async (req, res) => {
    try { if (req.access) await client.request('/auth/v1/logout?scope=local', { method: 'POST', token: req.access }); }
    finally { clearSession(res); }
    res.json({ ok: true });
  });
  app.post('/api/auth/password', authLimiter, async (req, res) => {
    if (!req.identity || !verifyRecovery(config.sessionSecret, req.cookies[names.recovery], req.identity.id, req.access)) throw new AppError('AUTH_LINK_INVALID', 400);
    if (!passwordValid(req.body.password) || req.body.password !== req.body.password_confirm) throw new AppError('PASSWORD_WEAK', 422);
    await client.request('/auth/v1/user', { method: 'PUT', token: req.access, body: { password: req.body.password } });
    try { await client.request('/auth/v1/logout?scope=global', { method: 'POST', token: req.access }); }
    catch { throw new AppError('PASSWORD_UPDATED_RELOGIN', 503); }
    finally { clearSession(res); }
    res.json({ updated: true });
  });
  app.all('/api/auth/{*path}', (req, res) => res.status(404).json({ code: 'NOT_FOUND' }));

  app.use('/api', async (req, res) => {
    if (!['GET', 'POST', 'PATCH'].includes(req.method)) throw new AppError('NOT_FOUND', 404);
    if (req.method === 'POST' && ['/appointments', '/clinic-register'].includes(req.path) && !config.legalReady) throw new AppError('LEGAL_PENDING', 503);
    const body = req.path === '/appointments' && req.method === 'POST' ? bookingInput(req.body) : req.body || {};
    const data = await client.rpc(req.access, req.method, req.path, body, { ...req.query, consent_version: config.consentVersion });
    res.json(req.path === '/me' && data ? { ...data, email: req.identity?.email || null } : data);
  });
  app.use('/shared', express.static(resolve(root, 'shared'), { dotfiles: 'deny' }));
  app.use('/auth', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.use(express.static(resolve(root, 'Frontend'), { dotfiles: 'deny' }));
  app.get('/{*path}', (req, res) => res.sendFile(resolve(root, 'Frontend/index.html')));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error instanceof AppError ? error.status : error.type === 'entity.too.large' ? 413 : error.type === 'entity.parse.failed' ? 400 : 500;
    res.status(status).json({ code: error instanceof AppError ? error.code : status < 500 ? 'INVALID' : 'SERVER' });
  });
  return app;
}
