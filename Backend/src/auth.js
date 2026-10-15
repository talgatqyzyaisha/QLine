import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
import { AppError, phone } from '../../shared/domain.js';

import {normalizeEmail, emailValid, passwordValid, safeReturn} from '../../shared/domain.js';
export {normalizeEmail, emailValid, passwordValid, safeReturn};
const jwtSession = token => {
  try { return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).session_id; } catch { return null; }
};
export function recoveryProof(secret, userId, accessToken, now = Date.now()) {
  const session = jwtSession(accessToken);
  if (!userId || !session) throw new AppError('AUTH_LINK_INVALID', 400);
  const payload = Buffer.from(JSON.stringify({ userId, session, expires: now + 10 * 60000 })).toString('base64url');
  return payload + '.' + createHmac('sha256', secret).update(payload).digest('base64url');
}
export function verifyRecovery(secret, proof, userId, accessToken, now = Date.now()) {
  if (typeof proof !== 'string') return false;
  const [payload, signature, extra] = proof.split('.');
  if (!payload || !signature || extra) return false;
  const expected = createHmac('sha256', secret).update(payload).digest();
  const received = Buffer.from(signature, 'base64url');
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return false;
  try {
    const record = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return record.userId === userId && record.session === jwtSession(accessToken) && record.expires > now;
  } catch { return false; }
}

export function createAuthService(client, config) {
  // Supabase's reuse grace interval handles cross-instance races; this queue also
  // deduplicates concurrent refreshes within one Node process.
  const refreshing = new Map();
  return {
    async signUp(body) {
      const email = normalizeEmail(body.email);
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (!emailValid(email) || !name || name.length > 100 || !passwordValid(body.password) || body.password !== body.password_confirm || body.consent !== true) throw new AppError('INVALID', 422);
      if (!config.legalReady) throw new AppError('LEGAL_PENDING', 503);
      try {
        const data = await client.request('/auth/v1/signup?redirect_to=' + encodeURIComponent(config.origin + '/auth/confirm'), {
        method: 'POST', body: { email, password: body.password, data: { name, consent: true, consent_version: config.consentVersion } }
      });
        return data;
      } catch (error) {
        if (error.code === 'ACCOUNT_EXISTS') return { confirmationRequired: true };
        throw error;
      }
    },
    async signIn(body) {
      const email = normalizeEmail(body.email);
      if (!emailValid(email) || typeof body.password !== 'string' || !body.password || body.password.length > 128) throw new AppError('INVALID_CREDENTIALS', 401);
      return client.request('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password: body.password } });
    },
    async recover(body) {
      const email = normalizeEmail(body.email);
      if (!emailValid(email)) throw new AppError('INVALID', 422);
      await client.request('/auth/v1/recover?redirect_to=' + encodeURIComponent(config.origin + '/auth/confirm'), { method: 'POST', body: { email } });
      return { sent: true };
    },
    async verify(body) {
      if (!['email', 'recovery', 'signup'].includes(body.type) || !/^[a-zA-Z0-9_-]{20,256}$/.test(body.token_hash || '')) throw new AppError('AUTH_LINK_INVALID', 400);
      return client.request('/auth/v1/verify', { method: 'POST', body: { token_hash: body.token_hash, type: body.type } });
    },
    async sendPhoneCode(body) {
      if (!config.smsEnabled) throw new AppError('SMS_DISABLED', 503);
      const number = phone(body.phone);
      if (!number) throw new AppError('INVALID', 422);
      await client.request('/auth/v1/otp', { method: 'POST', body: { phone: number, create_user: false } });
      return { sent: true };
    },
    async verifyPhone(body) {
      if (!config.smsEnabled) throw new AppError('SMS_DISABLED', 503);
      const number = phone(body.phone);
      if (!number || !/^\d{6}$/.test(body.code)) throw new AppError('INVALID', 422);
      return client.request('/auth/v1/verify', { method: 'POST', body: { phone: number, token: body.code, type: 'sms' } });
    },
    refresh(refreshToken) {
      const key = createHash('sha256').update(refreshToken).digest('hex');
      if (refreshing.has(key)) return refreshing.get(key);
      const promise = client.request('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: refreshToken } });
      refreshing.set(key, promise);
      promise.finally(() => { const timer = setTimeout(() => refreshing.delete(key), 5000); timer.unref?.(); }).catch(() => {});
      return promise;
    }
  };
}
