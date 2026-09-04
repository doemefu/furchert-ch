# homelab-furchert-ch — Interfaces

> This frontend only **consumes** interfaces; it exposes none for other services.
> §1 (OIDC client) is **implemented** as of Phase 4. §2's Prometheus metrics
> source is **implemented** as of issue #17; the auth-service/device-service
> REST proxies land in Phase 6.

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
- Session `maxAge` is **7 days** (#30), matching auth-service's refresh-token
  TTL / `oauth2_authorization` purge window (`../auth-service/INTERFACES.md`
  §1 "RP-Initiated Logout" and "Important Notes" #2). `updateAge` is left at
  the Auth.js default — a continuously-active session still slides its `exp`
  forward, which is a documented limitation, not fixed here: the resulting
  stale-but-present `id_token_hint` is still sent to the IdP at logout and is
  handled by auth-service's own graceful degradation (ends the IdP session,
  redirects to `/login?logout` instead of erroring — see that doc's "Important
  Notes" #7).
- Sign-out is a server route (`/api/federated-logout`) that ends the IdP session
  with `id_token_hint` and clears the local session cookie. If the session's
  JWT carries no `id_token` at all (`id_token_hint` is unconditionally required
  by auth-service), the route skips the IdP round-trip entirely — it only
  clears the local cookie and redirects to `/`, instead of sending a request
  that would only get a generic `400 invalid_token` page from the IdP (#30).
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

### Prometheus — `http://kube-prometheus-stack-prometheus.monitoring.svc.cluster.local:9090` (issue #17)

Read-only, unauthenticated (plain HTTP, no NetworkPolicy restricting `apps` →
`monitoring`), consumed only from `DashboardShell` (a Server Component) via
`src/lib/metrics/cluster.ts` — never through a route handler and never
reachable from the browser. Four instant queries (`POST /api/v1/query`,
2.5 s timeout each, run in parallel) power the `/dashboard` cluster strip and
the workload-backed app tiles:

- Per-node CPU %: `(100 * (1 - avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])))) * on(instance) group_left(nodename) node_uname_info`
- Per-node MEM %: `(100 * (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * on(instance) group_left(nodename) node_uname_info`
- Node ready state: `kube_node_status_condition{condition="Ready",status="true"}`
- Deployment availability: `kube_deployment_status_replicas_available{namespace=~"apps|monitoring|flux-system"}`

Any failure (unreachable, timeout, malformed response, empty result) degrades
the dashboard to an honest "unavailable" fallback instead of fabricating
data — see `OVERVIEW.md`.
