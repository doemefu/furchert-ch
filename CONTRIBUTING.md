# Contributing — homelab-furchert-ch

> Stub — expanded as tooling lands (Phase 1+).

## Prerequisites

- Node.js (version pinned via `.nvmrc`/`package.json` engines once Phase 1 lands)
- `pnpm`
- For dashboard/admin work: `kubectl` access to the cluster, and the `furchert-ch`
  OIDC client registered in `../auth-service`

## Local development

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm lint
pnpm build
```

Local OIDC (Auth.js v5): copy `.env.local.example` → `.env.local` (never
committed) and set `AUTH_SECRET` (`openssl rand -base64 33`) and the plaintext
`OIDC_CLIENT_SECRET`. The callback
`http://localhost:3000/api/auth/callback/furchert-ch` and post-logout
`http://localhost:3000` must be allowed on the auth-service `furchert-ch` client
(register it per `DEPLOYMENT.md` — note the JDBC `psql` seed step). Sign-out goes
through `/api/federated-logout` (RP-initiated, ends the IdP session).

Reach backends locally:
```bash
kubectl -n apps port-forward svc/auth-service 8080:8080
kubectl -n apps port-forward svc/device-service 8081:8081
```

## Process

- Follow the 6-phase workflow in `CLAUDE.md` / `.claude/rules/workflow.md`. One
  worklog per milestone; update `.claude/memory/MEMORY.md` (newest on top) when done.
- Recreate the design pixel-faithfully from the prototype source. `/automation`
  stays a mockup.
- No secrets in git. Pin dependency versions. Never auto-commit — the user commits.
