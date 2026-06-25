# homelab-furchert-ch — Deployment

> Stub — filled in Phase 7. Mirrors the `auth-service` deployment model.

## Model

- Container: multi-stage `Dockerfile`, Next.js standalone output, pinned base image.
- Registry: `ghcr.io/doemefu/furchert-ch:main-<UTC timestamp>` (built by GitHub Actions).
- Cluster: k3s, namespace `apps`, `replicas: 1`, resource requests+limits, liveness+readiness probes.
- GitOps: Flux CD via `../infrastructure/cluster/apps/furchert-ch/` (source, imagerepo, imagepolicy, imageupdate, sync, kustomization — copied from the auth-service set). Image tag is a Flux-managed setter.
- Ingress: Cloudflare Tunnel → `furchert.ch` → `furchert-ch.apps.svc.cluster.local` (see `../infrastructure/APPS.md` ingress pattern).

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
device-service (Phase 6). **Set `AUTH_URL=https://furchert.ch` in production:**
Auth.js infers it for callbacks behind the tunnel when `trustHost` is set, but
the federated-logout route uses it to build `post_logout_redirect_uri`. If
unset, it falls back to the request origin, which behind Cloudflare Tunnel →
Traefik can resolve to an internal origin that the IdP rejects (it must match a
registered `post-logout-redirect-uris` value, i.e. `https://furchert.ch`).

> **Auth.js v5 env names** — use `AUTH_SECRET` (not the v4 `NEXTAUTH_SECRET`)
> and `AUTH_URL` (not `NEXTAUTH_URL`). Local dev: copy `.env.local.example` →
> `.env.local` (gitignored).

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

Then smoke `/dashboard`: OIDC login at auth.furchert.ch round-trips and logout
returns to the apex.

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
