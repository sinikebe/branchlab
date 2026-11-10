import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ensureWorkersSubdomain } from './ensure-workers-subdomain.js';

const accountId = '1234567890abcdef1234567890abcdef';
const apiToken = 'test-token-not-a-real-secret';
const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/subdomain`;
const existing = (subdomain) => ({ success: true, errors: [], result: { subdomain } });
const missing = { success: false, errors: [{ code: 10007 }], result: null };

function response(payload, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => payload };
}

function scenario(responses, subdomain = 'branchlab-test') {
  const calls = [];
  const execute = () =>
    ensureWorkersSubdomain({
      accountId,
      apiToken,
      subdomain,
      fetchImpl: async (url, options) => {
        calls.push({ url, ...options });
        const next = responses.shift();
        if (next instanceof Error) throw next;
        return next;
      },
    });
  return { execute, calls };
}

test('preserves an existing account namespace even when a different or invalid name is requested', async () => {
  for (const requested of ['another-project', undefined, 'INVALID.name']) {
    const { execute, calls } = scenario([response(existing('account-existing'))], requested);
    assert.equal(await execute(), 'account-existing');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, 'GET');
    assert.equal(calls[0].url, endpoint);
  }
});

test('creates the requested namespace only after an explicit 10007 response', async () => {
  const { execute, calls } = scenario([
    response(missing, 404),
    response(existing('branchlab-test')),
  ]);
  assert.equal(await execute(), 'branchlab-test');
  assert.deepEqual(
    calls.map(({ method }) => method),
    ['GET', 'PUT'],
  );
  assert.equal(calls[1].url, endpoint);
  assert.equal(calls[1].headers.Authorization, `Bearer ${apiToken}`);
  assert.deepEqual(JSON.parse(calls[1].body), { subdomain: 'branchlab-test' });
});

test('authentication, server errors and other API errors never trigger a mutation', async () => {
  for (const failure of [
    response({ success: false, errors: [{ code: 10000 }] }, 403),
    response(missing, 401),
    response(missing, 500),
    response({ success: false, errors: [{ code: 10001 }] }, 404),
    response({ success: false, errors: [{ code: 10007 }, { code: 10000 }] }, 404),
    response({ success: false, errors: [] }, 404),
  ]) {
    const { execute, calls } = scenario([failure]);
    await assert.rejects(execute);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, 'GET');
  }
});

test('invalid, incomplete or contradictory responses never trigger a mutation', async () => {
  for (const payload of [
    null,
    [],
    {},
    { success: true, errors: [], result: null },
    { success: true, errors: [{ code: 10007 }], result: { subdomain: 'existing' } },
    existing('invalid.example'),
    { ...missing, success: true },
    { ...missing, errors: [{ code: '10007' }] },
  ]) {
    const { execute, calls } = scenario([response(payload)]);
    await assert.rejects(execute);
    assert.equal(calls.length, 1);
  }
});

test('network and decoding failures are sanitized and never trigger a mutation', async () => {
  const sensitiveMessage = `${apiToken} ${accountId}`;
  for (const failure of [
    new Error(sensitiveMessage),
    {
      ok: true,
      status: 200,
      json: async () => {
        throw new Error(sensitiveMessage);
      },
    },
  ]) {
    const { execute, calls } = scenario([failure]);
    await assert.rejects(execute, (error) => {
      assert.equal(error.message.includes(apiToken), false);
      assert.equal(error.message.includes(accountId), false);
      return true;
    });
    assert.equal(calls.length, 1);
  }
});

test('an unsuccessful or unexpected creation response is reported without another write', async () => {
  for (const failure of [
    response({ success: false, errors: [{ code: 10031 }] }, 409),
    response(existing('different-name')),
    response({ success: true, errors: [], result: null }),
    new Error(`network failure ${apiToken}`),
  ]) {
    const { execute, calls } = scenario([response(missing, 404), failure]);
    await assert.rejects(execute);
    assert.deepEqual(
      calls.map(({ method }) => method),
      ['GET', 'PUT'],
    );
  }
});

test('invalid requested names cannot be registered', async () => {
  for (const name of ['', 'UPPER', 'a.example', '-start', 'end-', 'a'.repeat(64), 'a\nb']) {
    const { execute, calls } = scenario([response(missing, 404)], name);
    await assert.rejects(execute, /CLOUDFLARE_WORKERS_SUBDOMAIN/);
    assert.equal(calls.length, 1);
  }
});

test('missing credentials fail before making a request', async () => {
  let calls = 0;
  for (const credentials of [
    { accountId: undefined, apiToken },
    { accountId: '../wrong-account', apiToken },
    { accountId, apiToken: undefined },
  ]) {
    await assert.rejects(() =>
      ensureWorkersSubdomain({
        ...credentials,
        subdomain: 'branchlab-test',
        fetchImpl: async () => {
          calls += 1;
        },
      }),
    );
  }
  assert.equal(calls, 0);
});
