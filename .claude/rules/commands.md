# Repository Commands

## Develop & Build
```bash
pnpm install                      # Install pinned dependencies
pnpm dev                          # Run dev server (http://localhost:3000)
pnpm build                        # Production build (Next standalone)
pnpm start                        # Serve the production build
pnpm lint                         # ESLint
pnpm typecheck                    # tsc --noEmit (if not folded into lint/build)
docker build -t furchert-ch .     # Build container image
```

## Cluster access (local dev / verification)
```bash
kubectl get nodes -o wide                                  # Cluster status
kubectl get pods -n apps                                   # App pods
kubectl -n apps port-forward svc/auth-service 8080:8080    # Reach auth-service locally
kubectl -n apps port-forward svc/device-service 8081:8081  # Reach device-service locally
kubectl apply --dry-run=client -k k8s/                     # Validate manifests
```

## Local OIDC against auth.furchert.ch
- Requires the `furchert-ch` OIDC client registered in `../auth-service`
  (`application.yaml`) and `OIDC_CLIENT_SECRET` + `NEXTAUTH_SECRET` in `.env.local`
  (never committed). Callback: `http://localhost:3000/api/auth/callback/furchert-ch`.

## Useful
```bash
rg "<symbol>"                     # ripgrep search
git log -p -- <path>              # history for a path
```
