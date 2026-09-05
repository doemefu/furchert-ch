# Contributing — homelab-furchert-ch

## Prerequisites

- Node.js ≥ 22 (`package.json` engines) and pnpm 9.15.4 (`packageManager` field)
- For dashboard/admin work: `kubectl` access to the cluster, and the `furchert-ch`
  OIDC client registered in `../auth-service`

## Local development

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm lint
pnpm build
```

CI (`ci.yml`) runs this same lint/typecheck/build `verify` job on every PR,
capped at a 15-minute `timeout-minutes` guard (normal runtime ~1–2 min). If
your PR's `verify` job is cancelled at 15 minutes, treat that as a genuine
hang or regression, not a slow-but-normal run — see `DEPLOYMENT.md` §
"Build and Push run hangs" for the equivalent guard on the deploy pipeline
(#41).

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

Optional — live dashboard metrics locally (Prometheus, issue #17):
```bash
kubectl -n monitoring port-forward svc/kube-prometheus-stack-prometheus 19090:9090
```
Set `PROMETHEUS_URL=http://localhost:19090` in `.env.local` (see
`.env.local.example`). Left unset, the dashboard skips the fetch immediately
and renders the honest "unavailable" fallback — fine for non-dashboard work.

## Process

- Follow the 6-phase workflow in `CLAUDE.md` / `.claude/rules/workflow.md`. One
  worklog per milestone; update `.claude/memory/MEMORY.md` (newest on top) when done.
- Recreate the design pixel-faithfully from the prototype source. `/automation`
  stays a mockup.
- No secrets in git. Pin dependency versions. Never auto-commit — the user commits.
- **Code review tooling:** CodeRabbit is not installed on this repository
  (confirmed 2026-08-28: no response to a manual `@coderabbitai review`
  trigger). Copilot review is auto-requested but its account quota can be
  exhausted. If no bot review is available, substitute the parent-workspace
  `reviewer` subagent + `/code-review` and disclose the substitution in a PR
  comment before merging.
