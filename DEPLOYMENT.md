# homelab-furchert-ch — Deployment

> Stub — filled in Phase 7. Mirrors the `auth-service` deployment model.

## Model

- Container: multi-stage `Dockerfile`, Next.js standalone output, pinned base image.
- Registry: `ghcr.io/doemefu/homelab-furchert-ch:main-<UTC timestamp>` (built by GitHub Actions).
- Cluster: k3s, namespace `apps`, `replicas: 1`, resource requests+limits, liveness+readiness probes.
- GitOps: Flux CD via `../infrastructure/cluster/apps/furchert-ch/` (source, imagerepo, imagepolicy, imageupdate, sync, kustomization — copied from the auth-service set). Image tag is a Flux-managed setter.
- Ingress: Cloudflare Tunnel → `furchert.ch` → `furchert-ch.apps.svc.cluster.local` (see `../infrastructure/APPS.md` ingress pattern).

## Required secrets / env (provisioned by the user via SOPS — never in git)

k8s secret `homelab-furchert-ch-secrets` (keys; values user-provisioned):

| Env | Purpose |
|-----|---------|
| `AUTH_SECRET` | Auth.js v5 session encryption (`openssl rand -base64 33`) |
| `OIDC_CLIENT_SECRET` | `furchert-ch` OIDC client secret, **plaintext** (no `{noop}` prefix; matches auth-service) |

Plain env (non-secret): `OIDC_CLIENT_ID=furchert-ch`; optionally `AUTH_URL`
(Auth.js infers it behind the tunnel when `trustHost` is set, so usually
unneeded); cluster-internal upstream URLs for auth-service / device-service
(Phase 6).

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

(Full procedure + troubleshooting added in Phase 7.)
