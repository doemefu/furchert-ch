# homelab-furchert-ch — Interfaces

> This frontend only **consumes** interfaces; it exposes none for other services.
> §1 (OIDC client) is **implemented** as of Phase 4. §2's Prometheus metrics
> source is **implemented** as of issue #17; the auth-service/device-service
> REST proxies land in Phase 6. §3 (outbound SMTP for the contact form) is
> implemented as of issue #46. §2's data-service netmon read API (NM-1) is
> implemented as of issue #61; its LAN endpoints (NM-3) as of issue #62; its egress endpoint (NM-2) as of
> issue #63.

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
| Server-side grant (#61) | The same client also runs `client_credentials` with scope `netmon:read` (auth-service V6) for the data-service read API — see §2 "data-service" |

- Session strategy = JWT. The `role` claim is exposed to the browser session
  (fail-closed to `USER`). **Access/ID tokens are kept server-side only** and
  never reach the client. Phase 4 persists only the `id_token` (for logout);
  the `access_token` is (re)introduced in Phase 6 when admin proxying needs it.
- Session `maxAge` is **7 days** (#30), matching auth-service's
  `app.jwt.refresh-token-expiry: 604800000` (ms; `auth-service/src/main/
  resources/application.yaml`) — the refresh-token TTL / `oauth2_authorization`
  purge window (`../auth-service/INTERFACES.md` §1 "RP-Initiated Logout" and
  "Important Notes" #2). **Keep these two values in sync** — changing one
  without the other reintroduces the #30 mismatch. `updateAge` is left at
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
  In that case auth-service's own browser session cannot be ended from this
  RP either way (same outcome as before this change, since a missing hint
  got a `400` there too, not a session end) — a later sign-in may SSO
  silently against the IdP until that session times out on its own.
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

### data-service — `http://data-service.apps.svc.cluster.local:8082` (NM-1, #61; NM-3, #62; NM-2, #63)

Network-monitoring read API, consumed only by `/[locale]/dashboard/network`
(`NetworkShell`, a Server Component) through `src/lib/netmon/client.ts` —
never from a route handler, never from the browser. The contract is
`infrastructure/docs/060-network-monitoring.md` (§7 read API, §8 UI contract);
this section lists only what this app uses.

| Item | Value |
|------|-------|
| Env | `DATA_SERVICE_URL` (default `http://data-service.apps.svc.cluster.local:8082`), `DATA_SERVICE_TOKEN_URL` (default `http://auth-service.apps.svc.cluster.local:8080/oauth2/token`); `src/netmon.env.ts` |
| Auth | `Authorization: Bearer <token>` from a client-credentials grant: `POST DATA_SERVICE_TOKEN_URL` with HTTP Basic `OIDC_CLIENT_ID:OIDC_CLIENT_SECRET` (form-urlencoded per RFC 6749 §2.3.1), body `grant_type=client_credentials&scope=netmon:read`. Cached in process until `exp − 60 s` (`src/lib/netmon/token.ts`); one retry with a fresh token after a 401. No new secret |
| Endpoints | `GET /api/netmon/status`; `GET /api/netmon/inbound/summary?from&to&limit=10`; `GET /api/netmon/inbound/firewall-events?from&to&limit=50&cursor`; `GET /api/netmon/ips/{ip}?from&to` (only for a server-side `node:net isIP`-validated `?ip=`); LAN (NM-3): `GET /api/netmon/lan/connections?from&to`, `GET /api/netmon/lan/ufw-blocks?from&to&limit=50`, `GET /api/netmon/lan/ssh-auth?from&to` (page window; no `node`/`dport` filter used); egress (NM-2): `GET /api/netmon/egress/top?from&to&scope=external&limit=50` (page window; no `namespace` filter, no `scope=all`) |
| Window | `?window=24h\|7d\|30d` (default `24h`) mapped server-side to `from`/`to`; the IP detail never looks back less than 7 d |
| Timeouts | `cache: 'no-store'`, `AbortSignal.timeout(5000)` per call (token and data); all data calls (four NM-1 + three LAN + one egress) run in parallel |
| Errors | RFC 9457 `problem+json`: the `code` field is shown (`invalid_window`, `not_found`, …); 404 on the IP detail renders "not seen"; 404 on all three LAN endpoints (data-service without NM-3) renders "not yet available", and empty LAN results while the `lan` collector in `/status` has never succeeded, or last succeeded with an `upstream` warning and 0 consecutive failures, render "no LAN data yet" (node role not rolled out); 404 on `/egress/top` (data-service without NM-2) renders "not yet available", and an empty egress result while the `egress` collector has never succeeded (or only with the same `upstream` warning) renders "no egress data yet" (coroot node agent not rolled out) — an empty result after a success renders "no data in this window" with a hint to check the agent. Unreachable or a token failure renders "data-service unavailable"; a body that does not match §7.2 (for egress, any row without a string `destinationIp`, a numeric `destinationPort`, or string-or-null `fqdn`/`node`/`namespace`/`workload`/`container`) renders "unexpected response" for that section — never fabricated data |
| Logging | `[netmon] <endpoint> …` with the HTTP status or a short reason only — never tokens, URLs with query strings, or IP addresses |
| Gating | The page renders `NetworkShell` (and therefore makes any call) only after `auth()` + `asRole(session.user?.role) === 'ADMIN'`; USER sessions get `NoAccess` |

Firewall paging: the "older" link carries the cursor plus the window that
produced it (`?fwCursor=&fwFrom=&fwTo=`), so later pages query the same window.

Local dev: unless both `DATA_SERVICE_URL` and `DATA_SERVICE_TOKEN_URL` are set,
every call is skipped (`shouldAttemptNetmon()`),
see `.env.local.example` for the port-forward alternative.

## 3. Outbound: Infomaniak SMTP (contact form)

`furchert-ch` is an SMTP **client** of Infomaniak's mail service — the only
outbound mail path in the homelab (issue #46).

| Parameter | Value |
|-----------|-------|
| Endpoint | `mail.infomaniak.com:587` (STARTTLS, `requireTLS: true`) |
| Auth identity | `SMTP_USER` — the mailer also sets the `From` address to this same value, since Infomaniak rejects a mismatch between the authenticated identity and `From` |
| Env vars | `SMTP_HOST`, `SMTP_PORT` (default `587`), `SMTP_USER`, `SMTP_PASSWORD` (secret), `CONTACT_TO` (defaults to `SMTP_USER`) |
| Timeouts | `dnsTimeout` 5 s, `connectionTimeout` 5 s, `greetingTimeout` 5 s, `socketTimeout` 7 s — worst case before a visible error ≈ 22 s |
| Message shape | Plain text only (no HTML part, by design); `from` = `SMTP_USER`; `to` = `CONTACT_TO`; `replyTo` = the submitter's name/email; subject `Contact form: <name>` — the 80-char cap (control characters stripped) applies to the sanitised `name` inside the subject, so the full subject is ≈ up to 95 chars |
| What is logged | Success: `{messageLength}` only. Failure: `{code, responseCode, command}` destructured from the nodemailer error only — never the raw error, its `message`, `response`, or `rejected`/`rejectedErrors` fields, and never the submitter's name, email, or message body. The honeypot check and rate-limit denials log nothing |
| Rate limits | In-process (per pod) sliding window: 3 submissions / 10 min per client key (`cf-connecting-ip` → `x-forwarded-for` → `'unknown'`), 20 / hour globally; resets on pod restart (`replicas: 1`); a failed or unconfigured delivery gives the slot back (`undoContactRateLimit`) |

A missing/invalid SMTP configuration makes the action return
`{ok:false, error:'server'}` and log exactly one line
(`[contact] delivery not configured (SMTP_HOST/SMTP_USER/SMTP_PASSWORD
missing or SMTP_PORT invalid)`) — never a silent success. The client only
renders "sent" when the action returns `{ok:true}`, which happens only after
`sendMail()` resolves with at least one accepted recipient and none
rejected.
