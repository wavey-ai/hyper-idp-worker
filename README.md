# hyper-idp-worker

Cloudflare Worker replacement for the old `hyper-idp` VM service.

It is an HTTP Auth0 broker that runs on the Workers free tier:

- redirects users to Auth0
- handles the OAuth callback
- verifies the Auth0 ID token
- writes an encrypted `HttpOnly` first-party session cookie
- exposes `/profile`, `/validate`, and `/logout`

It does not run the Rust `hyper-idp` server. Workers receive HTTP requests behind Cloudflare-managed TLS, so this repo keeps the useful route/cookie shape but uses edge-native request handling.

## Routes

```text
GET  /login?return_to=...
GET  /oauth2/callback
GET  /profile
GET  /validate
POST /logout
GET  /logout
GET  /
```

## Auth0

Create a Regular Web Application in Auth0.

Allowed callback URL:

```text
https://id.bitneedle.com/oauth2/callback
```

Allowed logout URLs / web origins should include your app origins, for example:

```text
https://bitneedle.com
https://www.bitneedle.com
https://id.bitneedle.com
```

## Cloudflare config

For a bitneedle deployment, use a Worker route like:

```toml
routes = [
  { pattern = "id.bitneedle.com/*", zone_name = "bitneedle.com" },
]
```

Set non-secret vars in `wrangler.toml` or the Cloudflare dashboard:

```toml
AUTH0_DOMAIN = "YOUR_TENANT.eu.auth0.com"
AUTH0_CLIENT_ID = "..."
COOKIE_DOMAIN = ".bitneedle.com"
ALLOWED_ORIGINS = "https://bitneedle.com,https://www.bitneedle.com"
ALLOWED_RETURN_ORIGINS = "https://bitneedle.com,https://www.bitneedle.com"
```

Set secrets with Wrangler:

```sh
wrangler secret put AUTH0_CLIENT_SECRET
wrangler secret put COOKIE_SECRET
```

`COOKIE_SECRET` should be a long random value:

```sh
openssl rand -base64 32
```

## App usage

Login link:

```html
<a href="https://id.bitneedle.com/login?return_to=https%3A%2F%2Fbitneedle.com%2Fpress">Sign in</a>
```

Check auth from a browser app:

```js
const res = await fetch("https://id.bitneedle.com/profile", {
  credentials: "include",
});

if (res.ok) {
  const profile = await res.json();
}
```

## Notes

- Session state is stateless and encrypted in the cookie; no Durable Object or KV is required.
- `/validate` returns a compact compatibility response with `valid`, `user_id`, and `user`.
- `user_id` is a deterministic SHA-256-derived 64-bit decimal string, not the legacy Rust `xxh3` value.
- Add Durable Objects later only if we need server-side revocation, active-user lists, refresh-token storage, or local OIDC provider behavior.
