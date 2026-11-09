import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { AppError } from '../../shared/domain.js';
const jwt = 'header.' + Buffer.from(
  JSON.stringify({ session_id: 'verified-session' })
).toString('base64url') + '.signature';
const user = {
  id: 'verified-user',
  email: 'synthetic@example.com'
};
const session = {
  access_token: jwt,
  refresh_token: 'test-only-refresh',
  expires_in: 3600,
  user
};
const invoiceId = '11111111-1111-4111-8111-111111111111';
const clinicId = '22222222-2222-4222-8222-222222222222';
const config = {
  production: true,
  origin: 'https://qline.test',
  url: 'https://test.supabase.co',
  key: 'sb_publishable_public',
  sessionSecret: 'random-test-secret-at-least-32-characters',
  legalReady: true,
  consentVersion: 'test-review',
  smsEnabled: false,
  trustProxy: false
};
const cookies = response => [...new Map(
  response.headers.getSetCookie().map(value => {
    const pair = value.split(';')[0];
    return [pair.slice(0, pair.indexOf('=')), pair];
  })
).values()].join('; ');
async function withServer(run, invoiceStatus = 'unpaid') {
  const calls = [];
  let uploaded = null;
  let receipt = null;
  const client = {
    request: async (path, options = {}) => {
      calls.push({ path, ...options });
      if (path === '/auth/v1/token?grant_type=password') {
        return session;
      }
      if (path === '/auth/v1/user') {
        if (options.token !== jwt) {
          throw new AppError('UNAUTHORIZED', 401);
        }
        return user;
      }
      if (path.startsWith('/rest/v1/clinic_invoices?')) {
        if (invoiceStatus === 'missing') return [];
        return [{
          id: invoiceId,
          clinic_id: clinicId,
          status: invoiceStatus
        }];
      }
      if (path === '/rest/v1/clinic_payment_receipts') {
        receipt = options.body;
        return {};
      }
      throw new Error('Unexpected request: ' + path);
    },
    uploadStorage: async (path, options) => {
      uploaded = { path, ...options };
      return {};
    },
    rpc: async () => []
  };
  const app = createApp({ config, client });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const login = async () => {
    const response = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: config.origin
      },
      body: JSON.stringify({
        email: user.email,
        password: 'long test password phrase'
      })
    });
    assert.equal(response.status, 200);
    return cookies(response);
  };
  const upload = async (jar, form) => fetch(
    base + `/api/clinic/invoices/${invoiceId}/receipt`,
    {
      method: 'POST',
      headers: {
        Origin: config.origin,
        ...(jar ? { Cookie: jar } : {})
      },
      body: form
    }
  );
  try {
    await run({
      login,
      upload,
      calls,
      uploaded: () => uploaded,
      receipt: () => receipt
    });
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}
function pdfForm() {
  const form = new FormData();
  form.append(
    'receipt',
    new Blob(['%PDF-1.4 test document'], {
      type: 'application/pdf'
    }),
    'receipt.pdf'
  );
  return form;
}
test('unauthorized user cannot upload a receipt', () =>
  withServer(async ({ upload, calls, uploaded }) => {
    const response = await upload(null, pdfForm());

    assert.equal(response.status, 401);
    assert.equal((await response.json()).code, 'UNAUTHORIZED');
    assert.equal(uploaded(), null);
    assert.equal(
      calls.some(call => call.path === '/rest/v1/clinic_payment_receipts'),
      false
    );
  })
);

test('authenticated session uploads a valid PDF and creates pending metadata', () =>
  withServer(async ({ login, upload, uploaded, receipt }) => {
    const jar = await login();
    const response = await upload(jar, pdfForm());

    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), {
      uploaded: true,
      status: 'pending'
    });

    assert.ok(uploaded());
    assert.equal(uploaded().contentType, 'application/pdf');
    assert.equal(uploaded().token, jwt);
    assert.match(
      uploaded().path,
      new RegExp(`^${clinicId}/${invoiceId}/[0-9a-f-]+\\.pdf$`)
    );

    assert.ok(Buffer.isBuffer(uploaded().file));
    assert.equal(uploaded().file.subarray(0, 5).toString(), '%PDF-');

    assert.deepEqual(receipt(), {
      invoice_id: invoiceId,
      clinic_id: clinicId,
      storage_path: uploaded().path,
      submitted_by: user.id,
      status: 'pending'
    });
  })
);

test('unsupported file type is rejected', () =>
  withServer(async ({ login, upload, uploaded, receipt }) => {
    const jar = await login();
    const form = new FormData();

    form.append(
      'receipt',
      new Blob(['not a receipt'], { type: 'text/plain' }),
      'receipt.txt'
    );

    const response = await upload(jar, form);

    assert.equal(response.status, 422);
    assert.equal((await response.json()).code, 'INVALID');
    assert.equal(uploaded(), null);
    assert.equal(receipt(), null);
  })
);

test('paid or missing invoice cannot receive a receipt', async t => {
  for (const status of ['paid', 'missing']) {
    await t.test(status, () =>
      withServer(async ({ login, upload, uploaded, receipt }) => {
        const jar = await login();
        const response = await upload(jar, pdfForm());

        assert.equal(response.status, 404);
        assert.equal((await response.json()).code, 'NOT_FOUND');
        assert.equal(uploaded(), null);
        assert.equal(receipt(), null);
      }, status)
    );
  }
});