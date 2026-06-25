# homelab-furchert-ch — Interfaces

> This frontend only **consumes** interfaces; it exposes none for other services.
> §1 (OIDC client) is **implemented** as of Phase 4. §2 (backend REST proxies)
> lands in Phase 6.

## 1. OIDC client (auth.furchert.ch) — implemented (Phase 4)

`furchert-ch` is an OIDC **client** of `homelab-auth-service` (see
`../auth-service/INTERFACES.md`), wired with **Auth.js v5** (`next-auth`).

| Parameter | Value |
|-----------|-------|
| Issuer / discovery | `https://auth.furchert.ch/.well-known/openid-configuration` |
| Flow | Authorization Code + PKCE (PKCE/nonce derived from discovery) |
| Client ID | `furchert-ch` |
| Scopes | `openid profile email` |
| Redirect URI | `https://furchert.ch/api/auth/callback/furchert-ch` (+ `http://localhost:3000/...` for dev) |
| End session | `https://auth.furchert.ch/connect/logout` (RP-initiated, with `id_token_hint`) |
| Post-logout redirect | `https://furchert.ch` (+ `http://localhost:3000` for dev) |
| Claims used | `sub`, `name`, `email`, `role` (`USER`/`ADMIN`) |

- Session strategy = JWT. The `role` claim is exposed to the browser session
  (fail-closed to `USER`). **Access/ID tokens are kept server-side only** and
  never reach the client. Phase 4 persists only the `id_token` (for logout);
  the `access_token` is (re)introduced in Phase 6 when admin proxying needs it.
- Sign-out is a server route (`/api/federated-logout`) that ends the IdP session
  with `id_token_hint` and clears the local session cookie.
- The matching client must be registered in `../auth-service` (see
  `DEPLOYMENT.md` for the ready-to-apply diff + the JDBC `psql` seed note);
  secret env `FURCHERT_CH_CLIENT_SECRET`.

## 2. Backend REST APIs consumed (server-side proxy)

Calls are made from Next route handlers using the user's OIDC access token; the
token never reaches the browser. Cluster-internal base URLs.

### auth-service — `http://auth-service.apps.svc.cluster.local:8080`
Per `../auth-service/INTERFACES.md` (to be enumerated in Phase 6): user management
(`/api/v1/users`), OIDC clients (`/api/v1/clients`), JWKS (`/oauth2/jwks`).

### device-service — `http://device-service.apps.svc.cluster.local:8081`
Per `../device-service/INTERFACES.md` (Phase 6): `/devices`, `/devices/{id}`,
`/devices/{id}/control`. Live WebSocket/STOMP stream optional/deferred.

Surfaces in the admin GUIs without a backing endpoint are rendered as clearly
labelled placeholders — never fabricated data.

(Exact endpoint/shape table added in Phase 6.)
