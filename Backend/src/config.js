import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';

export function loadConfig(env = process.env) {
  const production = env.NODE_ENV === 'production';
  if (env.DATA_MODE && env.DATA_MODE !== 'supabase') throw new Error('Only real Supabase storage is supported. Remove legacy DATA_MODE.');
  const origin = env.APP_ORIGIN || (production ? '' : 'http://localhost:3000');
  let parsed;
  try { parsed = new URL(origin); } catch { throw new Error('APP_ORIGIN must be a complete origin'); }
  if (parsed.origin !== origin || (production && parsed.protocol !== 'https:')) throw new Error('APP_ORIGIN must be a canonical HTTPS origin in production');
  const url = env.SUPABASE_URL?.replace(/\/$/, '');
  const key = env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are required');
  if (!url.startsWith('https://')) throw new Error('SUPABASE_URL must use HTTPS');
  const sessionSecret = env.SESSION_SECRET || (production ? '' : randomBytes(32).toString('hex'));
  if (sessionSecret.length < 32) throw new Error('SESSION_SECRET must contain at least 32 random characters');
  const legalFilesReady = ['ru', 'kz'].every(lang => {
    try {
      const file = JSON.parse(readFileSync(resolve(import.meta.dirname, '../../Frontend/content/legal.' + lang + '.json'), 'utf8'));
      return ['privacy', 'agreement', 'terms', 'contact', 'reviewedAt'].every(key => typeof file[key] === 'string' && file[key].trim());
    } catch { return false; }
  });
  return Object.freeze({ production, origin, url, key, sessionSecret,
    legalReady: env.LEGAL_APPROVED === 'true' && Boolean(env.CONSENT_VERSION) && legalFilesReady,
    consentVersion: env.CONSENT_VERSION || null,
    smsEnabled: env.SMS_ENABLED === 'true', trustProxy: env.TRUST_PROXY === '1',
    port: Number(env.PORT) || 3000
  });
}
