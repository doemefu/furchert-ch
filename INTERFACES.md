# homelab-furchert-ch — Interfaces

> Stub — filled during Phases 4 & 6 as integrations land. This frontend only
> **consumes** interfaces; it exposes none for other services.

## 1. OIDC client (auth.furchert.ch)

`furchert-ch` is an OIDC **client** of `homelab-auth-service` (see
`../auth-service/INTERFACES.md`).

| Parameter | Value |
|-----------|-------|
| Issuer / discovery | `https://auth.furchert.ch/.well-known/openid-configuration` |
| Flow | Authorization Code + PKCE |
| Client ID | `furchert-ch` |
| Scopes | `openid profile email` |
| Redirect URI | `https://furchert.ch/api/auth/callback/furchert-ch` (+ `http://localhost:3000/...` for dev) |
| Post-logout | `https://furchert.ch` |
| Claims used | `sub`, `name`, `email`, `role` (`USER`/`ADMIN`) |

The matching client must be registered in `../auth-service`
(`src/main/resources/application.yaml`) with secret env `FURCHERT_CH_CLIENT_SECRET`.

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
