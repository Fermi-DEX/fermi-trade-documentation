import http from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const random = () => randomBytes(32).toString('hex');
const cookieName = '__Secure-fermi_oauth';
const cookieOptions = 'Path=/oauth/; HttpOnly; Secure; SameSite=Lax';
const ttl = 5 * 60 * 1000;
const safeJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

export function createOAuthServer({
  origin = 'https://docs.fermi.trade',
  clientId = '', clientSecret = '',
  repository = 'Fermi-DEX/fermi-trade-documentation',
  scope = 'repo', fetchImpl = fetch, now = Date.now,
} = {}) {
  const canonical = new URL(origin);
  if (canonical.protocol !== 'https:' || canonical.origin !== origin) throw new Error('OAuth origin must be a canonical HTTPS origin');
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error('Invalid repository');
  const configured = Boolean(clientId && clientSecret);
  const pending = new Map();

  return http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const text = (status, body) => { res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end(body); };
    const url = new URL(req.url, origin);
    if (req.method !== 'GET') return text(405, 'Method not allowed');
    if (url.pathname === '/healthz') return text(200, 'ok');
    if (url.pathname === '/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ configured }));
    }
    if (!['/auth', '/callback'].includes(url.pathname)) return text(404, 'Not found');
    if (!configured) return text(503, 'GitHub OAuth is not configured. Run setup.sh --configure on the VM.');
    for (const [state, entry] of pending) if (now() - entry.created > ttl) pending.delete(state);

    if (url.pathname === '/auth') {
      if (url.searchParams.has('provider') && url.searchParams.get('provider') !== 'github') return text(400, 'Unsupported provider');
      if (url.searchParams.has('site_id') && url.searchParams.get('site_id') !== canonical.hostname) return text(400, 'Invalid site');
      if (pending.size >= 1000) return text(503, 'Please try again later');
      const state = random();
      const cookie = random();
      pending.set(state, { cookie, created: now() });
      res.setHeader('Set-Cookie', `${cookieName}=${cookie}; ${cookieOptions}; Max-Age=300`);
      const authorize = new URL('https://github.com/login/oauth/authorize');
      authorize.search = new URLSearchParams({ client_id: clientId, redirect_uri: `${origin}/oauth/callback`, scope, state });
      res.writeHead(302, { Location: authorize.href });
      return res.end();
    }

    const state = url.searchParams.get('state');
    const entry = pending.get(state);
    const cookie = req.headers.cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
    if (!entry || !cookie || !/^[a-f0-9]{64}$/.test(cookie) || !timingSafeEqual(Buffer.from(cookie), Buffer.from(entry.cookie))) return text(400, 'Invalid or expired login. Start again from the editor.');
    pending.delete(state);
    res.setHeader('Set-Cookie', `${cookieName}=; ${cookieOptions}; Max-Age=0`);
    if (url.searchParams.has('error')) return text(400, 'GitHub login was cancelled. Start again from the editor.');
    const code = url.searchParams.get('code');
    if (!code || code.length > 1024) return text(400, 'Missing authorization code');

    try {
      const exchange = await fetchImpl('https://github.com/login/oauth/access_token', {
        method: 'POST', signal: AbortSignal.timeout(15000),
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: `${origin}/oauth/callback` }),
      });
      if (!exchange.ok) throw new Error('exchange');
      const result = await exchange.json();
      if (typeof result.access_token !== 'string' || !result.access_token) throw new Error('exchange');
      const permission = await fetchImpl(`https://api.github.com/repos/${repository}`, {
        signal: AbortSignal.timeout(15000),
        headers: { Authorization: `Bearer ${result.access_token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'fermi-docs-editor' },
      });
      if (!permission.ok || !(await permission.json()).permissions?.push) return text(403, 'Your GitHub account needs write access to the documentation repository.');
      const nonce = random();
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'`,
      });
      const message = `authorization:github:success:${JSON.stringify({ token: result.access_token, provider: 'github' })}`;
      return res.end(`<!doctype html><html lang="en"><meta charset="utf-8"><title>Fermi editor login</title><p>Completing login. You can close this window if the editor does not return.</p><script nonce="${nonce}">
        const origin = ${safeJson(origin)};
        const message = ${safeJson(message)};
        if (window.opener) {
          window.addEventListener('message', function handshake(event) {
            if (event.origin !== origin || event.source !== window.opener || event.data !== 'authorizing:github') return;
            window.removeEventListener('message', handshake);
            window.opener.postMessage(message, origin);
          });
          window.opener.postMessage('authorizing:github', origin);
        }
      </script></html>`);
    } catch {
      // Never log the exchange response, authorization code, or access token.
      return text(502, 'GitHub login could not complete. Please start again from the editor.');
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createOAuthServer({
    origin: process.env.SITE_URL,
    clientId: process.env.OAUTH_CLIENT_ID,
    clientSecret: process.env.OAUTH_CLIENT_SECRET,
    scope: process.env.OAUTH_SCOPE || 'repo',
  });
  server.listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log('Fermi editor authentication is listening.'));
  process.on('SIGTERM', () => server.close(() => process.exit(0)));
}
