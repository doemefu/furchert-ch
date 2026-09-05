# homelab-furchert-ch — Deployment

> Mirrors the `auth-service` deployment model.

## Model

- Container: multi-stage `Dockerfile`, Next.js standalone output, pinned base image.
- Registry: `ghcr.io/doemefu/furchert-ch:main-<UTC timestamp>` (built by GitHub Actions).
- Cluster: k3s, namespace `apps`, `replicas: 1`, resource requests+limits, liveness+readiness probes.
- GitOps: Flux CD via `../infrastructure/cluster/apps/furchert-ch/` (source, imagerepo, imagepolicy, imageupdate, sync, kustomization — copied from the auth-service set). Image tag is a Flux-managed setter.
- Ingress: Cloudflare Tunnel → `furchert.ch` → `furchert-ch.apps.svc.cluster.local` (see `../infrastructure/APPS.md` ingress pattern).

## Security headers (#42)

`next.config.mjs`'s `headers()` applies these to every route (`source: '/:path*'`, including `/api/*` and `/_next/static/*` — see the inline comment there for why `next.config.js`, not `src/middleware.ts`):

| Header | Value |
|--------|-------|
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `X-Frame-Options` | `DENY` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Strict-Transport-Security` | `max-age=86400` (1 day — see "HSTS rollout" below) |
| `Content-Security-Policy-Report-Only` | `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'` |

**HSTS rollout.** This domain never sent `Strict-Transport-Security` before this change (neither app nor Cloudflare edge). Started conservative at `max-age=86400` (1 day) instead of the standard 1-year value, since a browser that receives HSTS enforces HTTPS-only for the full window with no way to revoke it early. **Follow-up action:** after a burn-in period with no HTTPS-access problems, raise `max-age` to a standard long-lived value (e.g. `31536000`) in `next.config.mjs`. `includeSubDomains`/`preload` are deliberately omitted — several sibling homelab services share this apex (`auth`/`device`/`club`/`n8n`/`grafana.furchert.ch`, see the parent `CLAUDE.md`) and are separate repos this app has no mandate to declare HSTS-safe for.

**CSP graduation gate.** `Content-Security-Policy-Report-Only` is deliberately not enforcing yet — there is no `report-uri`/`report-to` collector, so violations only surface in a visiting browser's own DevTools console. Before dropping `-Report-Only` (making it a blocking `Content-Security-Policy`):
1. Open each main public route and a signed-in `/dashboard` load in a real browser.
2. Check the DevTools console for `Content-Security-Policy-Report-Only` violation messages.
3. If clean, rename the header key from `Content-Security-Policy-Report-Only` to `Content-Security-Policy` in `next.config.mjs`.

Checked 2026-09-05 (before this graduation, as a baseline sanity check): `curl -s https://furchert.ch/de | grep -i cloudflareinsights` found nothing — Cloudflare Web Analytics/Rocket Loader is not injecting a beacon on this zone today, so `script-src`/`connect-src` need no `*.cloudflareinsights.com` addition. Re-check this if that Cloudflare zone feature is ever turned on, since it would otherwise report (or, once enforcing, break) on every page load.

## Required secrets / env (provisioned by the user via SOPS — never in git)

k8s secret `furchert-ch-secrets` in the `apps` namespace (values user-provisioned
via SOPS; created by `infrastructure/infra/playbooks/59_app_services.yml`). The
deployment maps each secret key to an env var via `secretKeyRef`:

| Secret key | Env var | Purpose |
|-----------|---------|---------|
| `auth-secret` | `AUTH_SECRET` | Auth.js v5 session encryption (`openssl rand -base64 33`; SOPS var `furchert_ch_auth_secret`) |
| `oidc-client-secret` | `OIDC_CLIENT_SECRET` | `furchert-ch` OIDC client secret, **plaintext** (no `{noop}` prefix). The playbook sets it from the same SOPS var (`auth_service_furchert_ch_client_secret`) that auth-service stores `{noop}`-prefixed, so the two match by construction. |

Plain env (non-secret): `OIDC_CLIENT_ID=furchert-ch`; `OIDC_ISSUER`
(bare issuer base URL, **no trailing slash**; defaults to
`https://auth.furchert.ch`); cluster-internal upstream URLs for auth-service /
device-service (Phase 6); `PROMETHEUS_URL` — base URL of
`kube-prometheus-stack-prometheus` (issue #17), read server-side only for the
`/dashboard` live cluster/app metrics. Defaults to
`http://kube-prometheus-stack-prometheus.monitoring.svc.cluster.local:9090`
if unset — set explicitly in `k8s/deployment.yaml` anyway (explicit over
implicit). Optional by design: an unreachable/unset Prometheus degrades the
dashboard to an honest fallback instead of failing the build or the request.
For local dev, port-forward it first:
`kubectl -n monitoring port-forward svc/kube-prometheus-stack-prometheus 19090:9090`,
then set `PROMETHEUS_URL=http://localhost:19090` in `.env.local`. Left unset
in dev, the dashboard skips the fetch immediately (no 2.5 s stall on an
unreachable cluster-internal FQDN).

**Set `AUTH_URL=https://furchert.ch` in production:**
Auth.js infers it for callbacks behind the tunnel when `trustHost` is set, but
the federated-logout route uses it to build `post_logout_redirect_uri`. If
unset, it falls back to the request origin, which behind Cloudflare Tunnel →
Traefik can resolve to an internal origin that the IdP rejects (it must match a
registered `post-logout-redirect-uris` value, i.e. `https://furchert.ch`).

> **Auth.js v5 env names** — use `AUTH_SECRET` (not the v4 `NEXTAUTH_SECRET`)
> and `AUTH_URL` (not `NEXTAUTH_URL`). Local dev: copy `.env.local.example` →
> `.env.local` (gitignored).

**Session `maxAge` must stay in sync with auth-service (#30):**
`src/auth.config.ts`'s `session.maxAge` (7 days, hardcoded) is hand-synced
with auth-service's `app.jwt.refresh-token-expiry`
(`auth-service/src/main/resources/application.yaml`, `604800000` ms). If you
change one when deploying a release, change the other in the same release —
see `INTERFACES.md` §1.

### Cross-repo prerequisite — register the `furchert-ch` client in `../auth-service`

Apply in the **auth-service** repo (its own workflow; you commit it there) and
provision the secret via SOPS. furchert-ch never edits secret/age/`.sops.*` files.

1. `src/main/resources/application.yaml` → add to `app.oidc.clients` (mirrors `grafana`;
   do **not** copy device-service's `client_credentials`/`clients:admin`):
   ```yaml
         - client-id: furchert-ch
           client-secret: "${FURCHERT_CH_CLIENT_SECRET}"
           redirect-uris:
             - https://furchert.ch/api/auth/callback/furchert-ch
             - http://localhost:3000/api/auth/callback/furchert-ch
           post-logout-redirect-uris:
             - https://furchert.ch
             - http://localhost:3000
           scopes: [ openid, profile, email ]
   ```
2. `k8s/deployment.yaml` → env from `secretKeyRef`:
   ```yaml
         - name: FURCHERT_CH_CLIENT_SECRET
           valueFrom:
             secretKeyRef:
               name: homelab-auth-secrets
               key: furchert-ch-client-secret   # value = {noop}<plaintext> via SOPS
   ```
3. **Seed the client (auth-service INTERFACES §6).** Registered clients are
   JDBC-backed and `application.yaml` is bootstrap-only — `StaticClientSeeder`
   **skips clients that already exist**, so on an already-running auth-service the
   YAML alone will NOT seed `furchert-ch`. Insert it via `psql` (or re-seed a fresh
   DB) per `../auth-service/INTERFACES.md §6`. The plaintext `OIDC_CLIENT_SECRET`
   used by this app must match the `{noop}`-prefixed value stored for the client.

## Validation

```bash
docker build -t furchert-ch .
kubectl apply --dry-run=client -k k8s/
```

## Deploy procedure (GitOps — Flux)

The image is built by CI and rolled out by Flux; there is no manual `kubectl apply`.

1. **Build (automatic).** Push to `main` → `.github/workflows/build.yml` runs
   lint/typecheck/build, then builds a multi-arch image and pushes
   `ghcr.io/doemefu/furchert-ch:main-<UTC ts>` (+ a `sha` tag).
2. **Image automation (automatic).** Flux `ImageRepository`/`ImagePolicy`
   (`infrastructure/cluster/apps/furchert-ch/`) pick the newest `main-<ts>` tag and
   `ImageUpdateAutomation` writes it back into `k8s/deployment.yaml` on `main`.
3. **Sync (automatic).** The Flux `Kustomization` applies `./k8s` to the `apps`
   namespace; the rollout becomes Ready once `/api/health` passes the probes.

### One-time bring-up (user actions — outside this repo)

1. **auth-service OIDC client** — already registered (`application.yaml`); no change.
2. **Secrets (SOPS → cluster):** add `furchert_ch_auth_secret`
   (`openssl rand -base64 33`) to `all.sops.yml`
   (`auth_service_furchert_ch_client_secret` already exists), then
   `ansible-playbook infra/playbooks/59_app_services.yml` to create
   `furchert-ch-secrets`.
3. **Flux deploy key:** provision the `furchert-ch-flux-auth` secret (read access to
   `doemefu/furchert-ch`) in `flux-system`.
4. **GHCR package:** after the first `main` push, make the `furchert-ch` package
   public (or uncomment `secretRef: ghcr-auth` in the infra `imagerepo.yaml`),
   otherwise Flux cannot scan tags.
5. **Tunnel + DNS:** `ansible-playbook infra/playbooks/40_platform.yml` to publish
   the `furchert.ch` apex tunnel route; create the proxied `furchert` (+ `www`)
   CNAMEs and a Cloudflare Redirect Rule `www.furchert.ch → 301 https://furchert.ch`.

### Verify

```bash
flux get image repository furchert-ch        # newest main-<ts> detected
kubectl -n apps get deploy furchert-ch        # READY 1/1
kubectl -n apps logs deploy/furchert-ch       # no startup errors
curl -fsS https://furchert.ch/api/health      # {"status":"ok"}
curl -I https://www.furchert.ch               # 301 → https://furchert.ch
```

Then smoke `/dashboard`: OIDC login at auth.furchert.ch round-trips; logout
redirects to the apex, and reloading `/dashboard` immediately afterward
prompts for sign-in again — confirming the session cookie was actually
cleared, not just that the redirect fired (a redirect-only check would have
passed the pre-#30 `__Secure-` cookie bug below while leaving the user
signed in).

**Security headers (#42) — verify after this milestone's first deploy:**

```bash
curl -sI https://furchert.ch                  # bare `/` — middleware locale redirect; should carry the headers too
curl -sI https://furchert.ch/de               # rendered page — all 6 headers from "Security headers" above
curl -sI https://furchert.ch/api/health       # API route — all 6 headers (the case that justified next.config.js over middleware.ts)
```

If any of the three is missing headers, see Troubleshooting below.

### Troubleshooting

- **Pod CrashLoopBackOff on boot, `[auth] required env var … missing`** — a
  `furchert-ch-secrets` key is absent; re-run `59_app_services.yml`.
- **Login fails with `invalid_client` / redirect mismatch** — `oidc-client-secret`
  plaintext ≠ the auth-service `{noop}` value, or the redirect URI is not the apex.
  Both derive from the same SOPS var, so re-check the secret was applied on both sides.
- **New image never rolls out** — GHCR package is private (Flux can't scan) or the
  CI tag doesn't match `^main-[0-9]{8}T[0-9]{6}$`; check `flux get image policy furchert-ch`.
- **`www` not redirecting** — the tunnel routes the apex only; `www` needs the
  Cloudflare Redirect Rule (step 5).
- **Logout redirects to `/` but the user is still signed in (production
  only)** — historical bug, fixed in #30: the session-cookie deletion in
  `/api/federated-logout` was missing the `secure` attribute on the
  `__Secure-`-prefixed cookie name. Per the cookie-prefix rule (RFC 6265bis
  §4.1.3), browsers silently reject a `Set-Cookie` deletion without it, so
  the original cookie stayed valid. Fixed via the shared
  `clearSessionCookies()` helper (`src/app/api/federated-logout/route.ts`),
  which derives `secure` from `secureCookie`/`NODE_ENV`. If this regresses,
  check that both call sites still pass the correct `secure` value to that
  helper.
- **Dashboard cluster strip shows "—" / "status unavailable"** — the Prometheus
  fetch failed or was skipped; this degrades by design and never surfaces as a
  500. Check `PROMETHEUS_URL` on the deployment, confirm
  `kubectl -n monitoring get svc kube-prometheus-stack-prometheus` resolves,
  and check pod logs for `[metrics] Prometheus unavailable: <reason>` /
  `[metrics] Prometheus queries failed: <cpu|mem|ready|workloads>` (terse
  message-only lines by design, no stack traces).
- **"Build and Push" run hangs in `build-and-push`** — root-caused 2026-09-04
  (issue #41). Both confirmed multi-hour hangs (run 33155146183, 2026-08-28,
  ~4 h 06 m; run 33333359400, 2026-08-30, ~6 h 00 m — the latter ended by
  GitHub's own default 360-minute job timeout, not a manual cancel) stall in
  the "Build and push multi-arch image" step, immediately after an identical
  `qemu: uncaught target signal 4 (Illegal instruction) - core dumped` crash
  while QEMU emulates the `linux/arm64` build stage running `pnpm install`/
  `pnpm build`. BuildKit's retries after that crash make no progress, and
  nothing previously bounded the job's runtime. This is a known, intermittent,
  hardware/timing-dependent class of QEMU user-mode-emulation bug (no reliable
  version pin is documented anywhere to fix it outright — see
  https://github.com/orgs/community/discussions/182217 for the same fault
  signature reported elsewhere); a shorter cancellation (run 33213817751,
  28 min) shows the same fault signature caught earlier by a quicker manual
  `gh run cancel`.
  **Fix (this issue):** `timeout-minutes` guards now bound the job's own
  execution time (45 min) and the multi-arch build step (40 min) — well
  above the observed normal execution time (successful `build-and-push` job:
  ~9–13 min; `verify` job: ~1.1 min observed max) but far below the hangs, so a
  recurrence now self-cancels within 45 minutes of the job actually
  *starting* instead of blocking for hours. This bounds job runtime only,
  not GitHub's runner-queue wait before a job starts — that queue time is
  unbounded and outside `timeout-minutes`' reach entirely: run 33482971910
  (2026-09-01, successful) took ~60 min of total wall-clock because its
  `verify` job spent ~46 min queued for a shared runner before running for
  ~1 min; that is normal GitHub Actions queueing, not a hang, and this fix
  neither bounds nor needs to bound it. `concurrency: cancel-in-progress:
  false` is unchanged (deliberately — considered and rejected flipping it to
  `true`, and a per-commit concurrency group, in #41's investigation) since
  the timeout guard already bounds the worst case regardless of concurrency
  strategy. Manual recovery is now rarely needed but still works the same
  way: if a run is still `in_progress` more than ~45 min after it actually
  started running (not merely queued), the job timeout has failed to fire
  as expected — cancel it manually:
- **A security header (#42) is missing from a live response** — `next.config.mjs`'s
  `headers()` matches `source: '/:path*'`, which covers pages, `/api/*`, and
  `/_next/static/*` alike, and (per Next.js's documented execution order —
  `headers` runs before Proxy/middleware) even a middleware-issued redirect
  like the bare `/` → `/de` locale redirect. If a response is missing them
  anyway, check whether a Route Handler under `src/app/api/` is constructing
  its own `Response` with an explicit header set that happens to omit them,
  and confirm the deployed image actually includes this milestone's
  `next.config.mjs` (`flux get image repository furchert-ch`).
- **"Build and Push" run hangs in `build-and-push`** — observed twice
  (2026-08-28: run 33155146183 hung ~4 h; run 33213817751 hung 28 min). With
  `concurrency: cancel-in-progress: false` a hung run blocks every later
  `main` build. If a merge has not rolled out within ~20 min:
  `gh run list --workflow "Build and Push" --limit 3`, then
  `gh run cancel <id>` for the stuck `in_progress` run — the next `main` push
  (or a manual re-run) rebuilds cleanly (Flux image automation picks up the
  new `main-<ts>` tag). A follow-up (native ARM64 GitHub-hosted runner via a
  build-per-arch matrix + manifest merge, removing QEMU emulation from this
  pipeline entirely — this repo is public, so `ubuntu-24.04-arm` runners are
  free) is tracked as #48 rather than bundled into this fix.
