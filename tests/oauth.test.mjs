import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createOAuthServer } from '../server/oauth.mjs';

async function fixture(t, options = {}) {
  const server = createOAuthServer({ clientId: 'test-client', clientSecret: 'test-secret', ...options });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  async function login() {
    const response = await fetch(`${base}/auth?provider=github&site_id=docs.fermi.trade`, { redirect: 'manual' });
    return { response, state: new URL(response.headers.get('location')).searchParams.get('state'), cookie: response.headers.get('set-cookie').split(';')[0] };
  }
  return { base, login };
}

test('unconfigured editor stays explicit while health remains available', async (t) => {
  const { base } = await fixture(t, { clientId: '', clientSecret: '' });
  assert.deepEqual(await (await fetch(`${base}/status`)).json(), { configured: false });
  assert.equal((await fetch(`${base}/healthz`)).status, 200);
  assert.equal((await fetch(`${base}/auth`)).status, 503);
});

test('login uses fresh state, secure cookies, and the exact callback', async (t) => {
  const { login } = await fixture(t);
  const a = await login(), b = await login();
  assert.notEqual(a.state, b.state);
  const location = new URL(a.response.headers.get('location'));
  assert.equal(location.origin, 'https://github.com');
  assert.equal(location.searchParams.get('redirect_uri'), 'https://docs.fermi.trade/oauth/callback');
  assert.match(a.response.headers.get('set-cookie'), /HttpOnly; Secure; SameSite=Lax/);
});

test('callback rejects absent, wrong, and expired browser state before exchange', async (t) => {
  let clock = 0, exchanges = 0;
  const { base, login } = await fixture(t, { now: () => clock, fetchImpl: () => { exchanges++; throw new Error(); } });
  const a = await login();
  assert.equal((await fetch(`${base}/callback?state=${a.state}&code=test`)).status, 400);
  assert.equal((await fetch(`${base}/callback?state=wrong&code=test`, { headers: { cookie: a.cookie } })).status, 400);
  clock = 301000;
  assert.equal((await fetch(`${base}/callback?state=${a.state}&code=test`, { headers: { cookie: a.cookie } })).status, 400);
  assert.equal(exchanges, 0);
});

test('successful login checks repo permissions and sends token only to the editor origin', async (t) => {
  const calls = [];
  const { base, login } = await fixture(t, { fetchImpl: async (url, options) => {
    calls.push({ url, options });
    return Response.json(calls.length === 1 ? { access_token: 'test-token</script>' } : { permissions: { push: true } });
  } });
  const a = await login();
  const response = await fetch(`${base}/callback?state=${a.state}&code=test`, { headers: { cookie: a.cookie } });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /event\.origin !== origin/);
  assert.match(html, /event\.source !== window\.opener/);
  assert.match(html, /authorization:github:success/);
  assert.ok(!html.includes('test-token</script>'));
  assert.match(response.headers.get('content-security-policy'), /script-src 'nonce-/);
  assert.equal(calls[1].url, 'https://api.github.com/repos/Fermi-DEX/fermi-trade-documentation');
  assert.equal(calls[1].options.headers.Authorization, 'Bearer test-token</script>');
  assert.equal((await fetch(`${base}/callback?state=${a.state}&code=test`, { headers: { cookie: a.cookie } })).status, 400);
});

test('read-only users cannot receive an editor token', async (t) => {
  let count = 0;
  const { base, login } = await fixture(t, { fetchImpl: async () => Response.json(++count === 1 ? { access_token: 'hidden' } : { permissions: { push: false } }) });
  const a = await login();
  const response = await fetch(`${base}/callback?state=${a.state}&code=test`, { headers: { cookie: a.cookie } });
  assert.equal(response.status, 403);
  assert.ok(!(await response.text()).includes('hidden'));
});

test('GitHub errors return a generic response without credentials', async (t) => {
  const { base, login } = await fixture(t, { fetchImpl: async () => { throw new Error('test-secret'); } });
  const a = await login();
  const response = await fetch(`${base}/callback?state=${a.state}&code=test`, { headers: { cookie: a.cookie } });
  assert.equal(response.status, 502);
  assert.ok(!(await response.text()).includes('test-secret'));
});
