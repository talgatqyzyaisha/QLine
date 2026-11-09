import { AppError } from '../../shared/domain.js';

/** Publishable API keys go only in apikey. Authorization is exclusively a user JWT. */
export function createSupabaseClient({ url, key, fetchImpl = globalThis.fetch }) {
async function request(path, { method = 'GET', body, token } = {}) {
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 12000);
const headers = { apikey: key, 'Content-Type': 'application/json' };
if (token) headers.Authorization = 'Bearer ' + token;

try {
  const response = await fetchImpl(url + path, {
    method,
    signal: controller.signal,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.message || data?.error_description || data?.msg || '';
    const providerCode = data?.error_code || data?.code || '';
    if (response.status === 429) throw new AppError('RATE_LIMITED', 429);
    if (path.startsWith('/auth/v1/token?grant_type=password')) throw new AppError('INVALID_CREDENTIALS', 401);
    if (path.startsWith('/auth/v1/verify')) throw new AppError('AUTH_LINK_INVALID', 400);
    if (['email_exists', 'user_already_exists'].includes(providerCode)) throw new AppError('ACCOUNT_EXISTS', 400);
    if (providerCode === 'weak_password') throw new AppError('PASSWORD_WEAK', 422);
    if (providerCode === 'PGRST202' || providerCode === 'PGRST205') throw new AppError('SETUP_REQUIRED', 503);
    if (message.includes('CONFLICT') || providerCode === '23P01') throw new AppError('CONFLICT', 409);
    if (message.includes('FORBIDDEN')) throw new AppError('FORBIDDEN', 403);
    if (message.includes('UNAUTHORIZED') || response.status === 401 || providerCode === 'refresh_token_not_found') throw new AppError('UNAUTHORIZED', 401);
    if (message.includes('NOT_FOUND')) throw new AppError('NOT_FOUND', 404);
    if (message.includes('INVALID') || response.status === 400 || response.status === 422) throw new AppError('INVALID', 422);
    throw new AppError('SERVER', 502);
  }
  return data;
} catch (error) {
  if (error instanceof AppError) throw error;
  throw new AppError('OFFLINE', 503);
} finally {
  clearTimeout(timer);
}

}

async function uploadStorage(path, { file, contentType, token } = {}) {
if (!Buffer.isBuffer(file) || !token) {
throw new AppError('INVALID', 422);
}

const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 20000);
try {
  const storagePath = path.split('/').map(encodeURIComponent).join('/');
  const response = await fetchImpl(
    url + '/storage/v1/object/clinic-payment-receipts/' + storagePath,
    {
      method: 'POST',
      signal: controller.signal,
      headers: {
        apikey: key,
        Authorization: 'Bearer ' + token,
        'Content-Type': contentType,
        'x-upsert': 'false'
      },
      body: file
    }
  );
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) throw new AppError('UNAUTHORIZED', 401);
    if (response.status === 403) throw new AppError('FORBIDDEN', 403);
    if (response.status === 413) throw new AppError('INVALID', 413);
    if (response.status === 429) throw new AppError('RATE_LIMITED', 429);
    throw new AppError('SERVER', 502);
  }
  return data;
} catch (error) {
  if (error instanceof AppError) throw error;
  throw new AppError('OFFLINE', 503);
} finally {
  clearTimeout(timer);
}

}

return {
  request,
  uploadStorage,
  createReceiptSignedUrl: (path, token, expiresIn = 60) => {
    const storagePath = path
      .split('/')
      .map(encodeURIComponent)
      .join('/');

    return request(
      '/storage/v1/object/sign/clinic-payment-receipts/' + storagePath,
      {
        method: 'POST',
        token,
        body: { expiresIn }
      }
    );
  },
  rpc: (token, method, path, body = {}, query = {}) =>
    request('/rest/v1/rpc/qline_api', {
      method: 'POST',
      token,
      body: {
        q_method: method,
        q_path: path,
        q_body: body,
        q_query: query
      }
    }),

  adminListPaymentReceipts: (token, limit = 50, offset = 0) =>
    request('/rest/v1/rpc/q_admin_list_payment_receipts', {
      method: 'POST',
      token,
      body: {
        p_limit: limit,
        p_offset: offset
      }
    }),

  adminReviewPaymentReceipt: (token, receiptId, action, reason = null) =>
    request('/rest/v1/rpc/q_admin_review_payment_receipt', {
      method: 'POST',
      token,
      body: {
        p_receipt_id: receiptId,
        p_action: action,
        p_reason: reason
      }
    })
};
}
