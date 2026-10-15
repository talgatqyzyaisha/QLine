import { AppError } from '/shared/domain.js';

/** Same-origin Express API. No fixture fallback, local booking store or client tokens. */
export async function api(path, { method = 'GET', body } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch('/api' + path, {
      method, credentials: 'same-origin', signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {})
    });
    const data = await response.json();
    if (!response.ok) throw new AppError(data.code || 'SERVER', response.status);
    return data;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('OFFLINE', 503);
  } finally { clearTimeout(timer); }
}
