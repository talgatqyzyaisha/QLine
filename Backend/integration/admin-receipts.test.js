import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { AppError } from '../../shared/domain.js';

const jwt = 'header.' + Buffer.from(
  JSON.stringify({ session_id: 'verified-session' })
).toString('base64url') + '.signature';

const user = {
  id: 'verified-admin',
  email: 'admin@example.com'
};

const session = {
  access_token: jwt,
  refresh_token: 'test-only-refresh',
  expires_in: 3600,
  user
};

const receiptId = '33333333-3333-4333-8333-333333333333';
const storagePath = 'clinic-demo/invoice-demo/receipt.pdf';

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

async function withServer(run, adminAllowed = true) {
  const calls = [];

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

      if (path.startsWith('/rest/v1/clinic_payment_receipts?')) {
        if (!adminAllowed) throw new AppError('FORBIDDEN', 403);
        return [{ storage_path: storagePath }];
      }

      throw new Error('Unexpected request: ' + path);
    },

    adminListPaymentReceipts: async (token, limit, offset) => {
      calls.push({ type: 'list', token, limit, offset });

      if (token !== jwt || !adminAllowed) {
        throw new AppError('FORBIDDEN', 403);
      }

      return [{
        id: receiptId,
        status: 'pending',
        storage_path: storagePath,
        clinic_name: 'Demo Clinic'
      }];
    },

    createReceiptSignedUrl: async (path, token, expiresIn) => {
      calls.push({ type: 'signed-url', path, token, expiresIn });
      return { signedURL: 'https://test.supabase.co/signed/receipt' };
    },

    adminReviewPaymentReceipt: async (token, id, action, reason) => {
      calls.push({ type: 'review', token, id, action, reason });

      if (token !== jwt || !adminAllowed) {
        throw new AppError('FORBIDDEN', 403);
      }

      return {
        success: true,
        receipt_id: id,
        status: action === 'approve' ? 'approved' : 'rejected',
        invoice_status: action === 'approve' ? 'paid' : 'unpaid'
      };
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

  const request = (path, body, jar) => fetch(base + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      ...(body === undefined ? {} : {
        'Content-Type': 'application/json',
        Origin: config.origin
      }),
      ...(jar ? { Cookie: jar } : {})
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });

  try {
    await run({ login, request, calls });
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

test('admin can list receipts without exposing storage paths', () =>
  withServer(async ({ login, request, calls }) => {
    const jar = await login();
    const response = await request('/api/admin/payment-receipts', undefined, jar);

    assert.equal(response.status, 200);

    const data = await response.json();

    assert.equal(data.length, 1);
    assert.equal(data[0].id, receiptId);
    assert.equal(data[0].storage_path, undefined);
    assert.ok(calls.some(call => call.type === 'list'));
  })
);

test('unauthorized user cannot list receipts', () =>
  withServer(async ({ request }) => {
    const response = await request('/api/admin/payment-receipts');

    assert.equal(response.status, 401);
  })
);

test('non-admin cannot list receipts', () =>
  withServer(async ({ login, request }) => {
    const jar = await login();
    const response = await request('/api/admin/payment-receipts', undefined, jar);

    assert.equal(response.status, 403);
  }, false)
);

test('admin receives a short-lived signed receipt URL', () =>
  withServer(async ({ login, request, calls }) => {
    const jar = await login();
    const response = await request(
      `/api/admin/payment-receipts/${receiptId}/file`,
      undefined,
      jar
    );

    assert.equal(response.status, 200);
    assert.equal(
      (await response.json()).url,
      'https://test.supabase.co/signed/receipt'
    );

    assert.ok(calls.some(call => call.type === 'list'));
    assert.ok(calls.some(call =>
      call.type === 'signed-url' &&
      call.path === storagePath &&
      call.expiresIn === 60
    ));
  })
);

test('admin can approve or reject a receipt', async t => {
  for (const action of ['approve', 'reject']) {
    await t.test(action, () =>
      withServer(async ({ login, request, calls }) => {
        const jar = await login();

        const body = action === 'reject'
          ? { action, reason: 'Receipt details are unreadable' }
          : { action };

        const response = await request(
          `/api/admin/payment-receipts/${receiptId}/review`,
          body,
          jar
        );

        assert.equal(response.status, 200);

        const result = await response.json();

        assert.equal(result.status, action === 'approve' ? 'approved' : 'rejected');

        assert.ok(calls.some(call =>
          call.type === 'review' &&
          call.action === action
        ));
      })
    );
  }
});

test('invalid review action is rejected', () =>
  withServer(async ({ login, request, calls }) => {
    const jar = await login();

    const response = await request(
      `/api/admin/payment-receipts/${receiptId}/review`,
      { action: 'delete' },
      jar
    );

    assert.equal(response.status, 422);
    assert.equal(
      calls.some(call => call.type === 'review'),
      false
    );
  })
);