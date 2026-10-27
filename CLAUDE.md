# CLAUDE.md — homelab-furchert-ch

> In-progress worklogs are listed at session start by the `homelab-workflow` plugin; start work with `/homelab-workflow:start-task`. Durable facts go to auto memory.

> `.claude/memory/`, `.claude/worklogs/` and `.claude/worktrees/` are gitignored — local-only; cross-check `git log`/GitHub when they look stale.

## Project Overview

`furchert-ch` is the **single web frontend for the whole doemefu homelab**. It is two things in one Next.js app:

1. **Public personal site** — Home, About, IT, Rowing, Projects, Automation, Contact (German + English).
2. **Private cluster control surface** — an OIDC-gated `/dashboard` with a homelab overview and an ADMIN-only `/dashboard/network` (data from `homelab-data-service`) and an ADMIN-only `/dashboard/auth` (users, device clients and JWKS via `homelab-auth-service`'s REST API, #44). The `homelab-device-service` admin GUI is planned (#45).

**Domain:** furchert.ch · **Deploy target:** k3s `apps` namespace via Flux CD, behind Cloudflare Tunnel. Live at https://furchert.ch since 2026-06-25, deployed via Flux image automation from `ghcr.io/doemefu/furchert-ch`.

## Architecture Context

- This repo is 1 of several homelab repos. It **consumes** sibling services; it does not host backend business logic.
- `/dashboard` authenticates with the **real** `homelab-auth-service` via OIDC (Authorization Code + PKCE) at `https://auth.furchert.ch`.
- `/dashboard/network` reads `homelab-data-service` server-side with a `client_credentials` token (scope `netmon:read`; `INTERFACES.md` §2 "data-service"; producer contract `../data-service/INTERFACES.md`, spec `../docs/060-network-monitoring.md`); the dashboard overview reads Prometheus server-side (`INTERFACES.md` §2 "Prometheus").
- `/dashboard/auth` calls the real REST API of `homelab-auth-service` (`../auth-service/INTERFACES.md`; `INTERFACES.md` §2 "auth-service") server-side with the signed-in admin's own access token (stored on the encrypted session JWT, refreshed in memory by `src/lib/authadmin/accessToken.ts`); mutations are Server Actions that re-check the ADMIN role. The planned device-service GUI (#45) will do the same against `../device-service/INTERFACES.md`.
- **The `/automation` section (incl. `/automation/scan`) is a visual MOCKUP only** — no Claude API, no scan backend, no persistence. Everything else is real.

**Full architecture spec:** `../docs/052-architecture-target.md`

**Design source of truth:** the exported Claude Design prototype (ETHON system).

**Implementation history:** `.claude/worklogs/` (local-only) and `docs/INDEX.md`

## Non-Negotiables (apply to every task)

- Do **not** touch secrets, credentials, age keys, `.sops.*`, or any `*_secret`/`*_token`/`*_key` files — ever. Secrets are provisioned by the user.
- Do **not** use `latest` for any container image or dependency — pin exact versions (no `^`/`~` ranges).
- Do **not** introduce new dependencies without explicit user approval.
- Do **not** make the `/automation` section functional — it is a mockup by design. No silent fake success anywhere else either.
- Commit, push and open PRs on feature branches without asking (standing permission, 2026-08-28). Merging PRs is always the user's. Rolling out changes the user has already merged needs no extra go (2026-10-09); force-pushes, playbook runs, other cluster mutations and anything touching secrets need an explicit go. SOPS files are never read or edited by Claude — the user edits them.
- Before any merge, wait for the Copilot review and fix or answer every comment (CodeRabbit is not installed here).
- All code, comments, and documentation in **English**.
- Minimize diff size: no drive-by refactors, no style-only churn, no renames unless required.
- Recreate the design **pixel-faithfully** from the prototype source; do not redesign.
- Always run the relevant lint/typecheck/test/build commands for the touched area and record results in the worklog.

## Tech Stack (pinned — see `package.json`)

| Component | Choice | Version |
|-----------|--------|---------|
| Framework | Next.js (App Router, TypeScript) | next 16.4.0, typescript 6.0.3 |
| UI runtime | React (Server + Client Components) | react / react-dom 19.3.0 |
| Package manager | pnpm | pnpm@9.15.4 (`packageManager` field) |
| Lint | ESLint flat config (`eslint.config.mjs`: eslint-config-next core-web-vitals + typescript) | eslint 9.39.5, eslint-config-next 16.4.0 |
| Unit tests | Vitest (node env, `vitest.config.mts`, `src/**/*.test.ts`; `pnpm test`, runs in CI) | vitest 4.1.11 |
| i18n | next-intl (`de` default, `en`; `/` → `/de`) | 4.14.9 |
| Auth | Auth.js (next-auth) generic OIDC → auth.furchert.ch | 5.0.0-beta.32 |
| Mail | nodemailer (contact form → Infomaniak SMTP) | 10.1.0 |
| Styling | ETHON design tokens in `src/styles/globals.css` (no UI kit) | — |
| Fonts | DM Sans + DM Mono (`next/font`) | — |
| Deploy | Docker (standalone) → k3s `apps` ns → Flux CD → Cloudflare Tunnel | base image `public.ecr.aws/docker/library/node:22.23.4-alpine` (ECR Public mirror of the Docker official image) |

Exact versions are pinned in `package.json` and the `Dockerfile` base image. Note: `@types/node` is pinned to 26.6.5 while the runtime is Node 22 — a known, harmless mismatch.

## Agent Team

Agents come from the `homelab-workflow` plugin: `homelab-workflow:<role>` for `architect`, `implementer`, `reviewer`, `documenter`, `devops`, `plan-reviewer`, `doc-auditor`. Repo specifics for each role live in `.claude/agent-context.md` (one section per role). There are no repo-only agents.

## Repository Layout

```
src/app/[locale]/        # public pages (about, contact, it, projects, rowing, automation) + /dashboard (overview, network, auth) (App Router)
src/app/api/             # auth/[...nextauth], federated-logout, health (server-side proxies; no scan API)
src/components/{ui,layout}/, Providers.tsx
src/lib/                 # server-side clients: metrics (Prometheus), netmon (data-service), authadmin (auth-service admin API), contact (SMTP); auth/ (shared.ts: Basic auth + session-cookie name; sameOrigin.ts: logout CSRF check); fonts.ts
src/*.env.ts             # lazy env accessors (auth, metrics, netmon, authadmin, contact)
src/data/                # typed static data (projects, cluster nodes, apps, home stats, ...)
src/i18n/                # messages/{de,en}.json + next-intl config (navigation.ts, request.ts, routing.ts)
src/proxy.ts             # next-intl locale routing (Next 16 proxy convention, formerly middleware.ts)
src/styles/globals.css   # ETHON tokens
src/types/css.d.ts       # TS 6 CSS-module typing fix (TS2882)
k8s/                     # deployment.yaml, kustomization.yaml (no separate service.yaml)
Dockerfile
vitest.config.mts        # unit tests (src/**/*.test.ts)
.npmrc                   # pins @types scope to npmjs (Dependabot GitHub Packages cache workaround)
```

---

## Process & Conventions

Process comes from the `homelab-workflow` plugin skills: `/homelab-workflow:start-task`, `workflow` (6-phase milestone flow, worklogs, plan structure), `review-gate`, `project-board`, `cross-repo`. Repo rules in `.claude/rules/` (auto-loaded by path):

| Rule file | Covers |
|-----------|--------|
| `code-style-conventions.md` | TypeScript/React/Next, ETHON tokens, secrets |
| `documentation-files.md` | README, OVERVIEW, INTERFACES, DEPLOYMENT, CONTRIBUTING, CHANGELOG |

Review: request Copilot first; CodeRabbit is not installed here. If Copilot quota is exhausted, use the `reviewer` agent plus `/code-review` and state in a PR comment which path was used. Use context7 for current Next.js / next-intl / Auth.js docs when planning. Each milestone ends buildable and shippable.

## Commands

```bash
pnpm install                      # install pinned dependencies
pnpm dev                          # dev server, http://localhost:3000
pnpm build                        # production build (Next standalone)
pnpm start                        # serve the production build
pnpm lint                         # eslint . (flat config; `next lint` no longer exists in Next 16)
pnpm typecheck                    # tsc --noEmit
pnpm test                         # vitest run (src/**/*.test.ts; also runs in CI)
docker build -t furchert-ch .     # build the container image
kubectl apply --dry-run=client -k k8s/                     # validate manifests
kubectl get pods -n apps                                   # app pods
kubectl -n apps port-forward svc/auth-service 8080:8080    # auth-service locally
kubectl -n apps port-forward svc/device-service 8081:8081  # device-service locally
```

Local OIDC needs the `furchert-ch` client registered in `../auth-service` (see `DEPLOYMENT.md`) and `OIDC_CLIENT_SECRET` + `AUTH_SECRET` in `.env.local` (out of git). Callback: `http://localhost:3000/api/auth/callback/furchert-ch`.
