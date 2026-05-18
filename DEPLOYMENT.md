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
| `NEXTAUTH_SECRET` | Auth.js session encryption |
| `OIDC_CLIENT_SECRET` | `furchert-ch` OIDC client secret (matches auth-service) |

Plain env (non-secret): `NEXTAUTH_URL`, `AUTH_ISSUER=https://auth.furchert.ch`,
`OIDC_CLIENT_ID=furchert-ch`, cluster-internal upstream URLs for auth-service /
device-service.

Cross-repo prerequisite: the `furchert-ch` client added to
`../auth-service/application.yaml` and `FURCHERT_CH_CLIENT_SECRET` wired into the
auth-service deployment (separate change in that repo, committed by the user).

## Validation

```bash
docker build -t furchert-ch .
kubectl apply --dry-run=client -k k8s/
```

(Full procedure + troubleshooting added in Phase 7.)
