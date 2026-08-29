# CLAUDE.md — homelab-furchert-ch

> **Session start:** Read `.claude/memory/MEMORY.md` completely. The topmost entry shows the current state. If there is an entry with `status: in_progress`, read the linked worklog and ask the user: *"I see we were interrupted at [SLUG]. Continue?"* — before doing anything else.

> **After each completed change:** Insert a new block **at the top** of `.claude/memory/MEMORY.md`. The file grows top-down — newest entries always visible first.

> `.claude/memory/` and `.claude/worklogs/` are gitignored — local-only; cross-check `git log`/GitHub when they look stale.

## Project Overview

`furchert-ch` is the **single web frontend for the whole doemefu homelab**. It is two things in one Next.js app:

1. **Public personal site** — Home, About, IT, Rowing, Projects, Automation, Contact (German + English).
2. **Private cluster control surface** — an OIDC-gated `/dashboard` with a homelab overview plus integrated admin GUIs for `homelab-auth-service` and `homelab-device-service`.

**Domain:** furchert.ch · **Deploy target:** k3s `apps` namespace via Flux CD, behind Cloudflare Tunnel. Live at https://furchert.ch since 2026-06-25, deployed via Flux image automation from `ghcr.io/doemefu/furchert-ch`.

## Architecture Context

- This repo is 1 of several homelab repos. It **consumes** sibling services; it does not host backend business logic.
- `/dashboard` authenticates with the **real** `homelab-auth-service` via OIDC (Authorization Code + PKCE) at `https://auth.furchert.ch`.
- Admin GUIs call the real REST APIs of `homelab-auth-service` (`../auth-service/INTERFACES.md`) and `homelab-device-service` (`../device-service/INTERFACES.md`), proxied server-side so the access token stays off the client.
- **The `/automation` section (incl. `/automation/scan`) is a visual MOCKUP only** — no Claude API, no scan backend, no persistence. Everything else is real.

**Design source of truth:** the exported Claude Design prototype (ETHON system), *not* the older `furchert-ch-website-spec.md` (which suggested antd and was superseded during design iteration).

**Implementation history:** `.claude/worklogs/` (local-only) and `docs/INDEX.md`

## Non-Negotiables (apply to every task)

- Do **not** touch secrets, credentials, age keys, `.sops.*`, or any `*_secret`/`*_token`/`*_key` files — ever. Secrets are provisioned by the user.
- Do **not** use `latest` for any container image or dependency — pin exact versions (no `^`/`~` ranges).
- Do **not** introduce new dependencies without explicit user approval.
- Do **not** make the `/automation` section functional — it is a mockup by design. No silent fake success anywhere else either.
- Commit, push and open PRs on feature branches without asking (standing permission, 2026-08-28). Merging, force-pushes, playbook runs, cluster mutations and anything touching SOPS/secrets need an explicit go for that task.
- Before any merge, wait for the Copilot review and fix or answer every comment (CodeRabbit is not installed here).
- All code, comments, and documentation in **English**.
- Minimize diff size: no drive-by refactors, no style-only churn, no renames unless required.
- Recreate the design **pixel-faithfully** from the prototype source; do not redesign.
- Always run the relevant lint/build commands for the touched area and record results in the worklog.

## Tech Stack (pinned — see `package.json`)

| Component | Choice | Version |
|-----------|--------|---------|
| Framework | Next.js (App Router, TypeScript) | next 15.5.24, typescript 6.0.3 |
| UI runtime | React (Server + Client Components) | react / react-dom 19.2.7 |
| Package manager | pnpm | pnpm@9.15.4 (`packageManager` field) |
| i18n | next-intl (`de` default, `en`; `/` → `/de`) | 4.13.0 |
| Auth | Auth.js (next-auth) generic OIDC → auth.furchert.ch | 5.0.0-beta.32 |
| Styling | ETHON design tokens in `src/styles/globals.css` (no UI kit) | — |
| Fonts | DM Sans + DM Mono (`next/font`) | — |
| Deploy | Docker (standalone) → k3s `apps` ns → Flux CD → Cloudflare Tunnel | base image `node:22.23.1-alpine` |

Exact versions are pinned in `package.json` and the `Dockerfile` base image. Note: `@types/node` is pinned to 26.0.1 while the runtime is Node 22 — a known, harmless mismatch. `pnpm.overrides.postcss` pins postcss to 8.5.23 (tracked for removal in #34).

## Agent Team

Seven project-level agents in `.claude/agents/` handle bigger implementations.

| Agent | Model | Role |
|-------|-------|------|
| `architect` | opus | Defines page/route/component contracts + backend API usage map before code |
| `implementer` | sonnet | Builds pages/components per the contract and the prototype |
| `reviewer` | opus | Reviews for security, pixel fidelity, contract compliance |
| `documenter` | sonnet | Keeps README/OVERVIEW/INTERFACES/DEPLOYMENT accurate |
| `devops` | sonnet | Dockerfile, k8s manifests, Flux wiring, Cloudflare Tunnel ingress |
| `plan-reviewer` | (inherit) | Phase 3 plan defect + architecture review |
| `doc-auditor` | (inherit) | Phase 6 documentation gap audit |

## Repository Layout

```
src/app/[locale]/        # public pages (about, contact, it, projects, rowing, automation) + /dashboard (App Router)
src/app/api/             # auth/[...nextauth], federated-logout, health (server-side proxies; no scan API)
src/components/{ui,layout}/, Providers.tsx
src/data/                # typed static data (projects, cluster nodes, apps, home stats, ...)
src/i18n/                # messages/{de,en}.json + next-intl config (navigation.ts, request.ts, routing.ts)
src/styles/globals.css   # ETHON tokens
src/types/css.d.ts       # TS 6 CSS-module typing fix (TS2882)
k8s/                     # deployment.yaml, kustomization.yaml (no separate service.yaml)
Dockerfile
.npmrc                   # pins @types scope to npmjs (Dependabot GitHub Packages cache workaround)
```

---

## Process & Conventions

Detailed process rules live in `.claude/rules/` (auto-loaded by Claude Code):

| Rule file | Covers |
|-----------|--------|
| `workflow.md` | 6-phase milestone workflow (resumable; includes plan-approval checklist) |
| `worklog-conventions.md` | Worklog location, naming, header, structure |
| `plan-structure.md` | 8-section plan template |
| `commands.md` | pnpm / Next / Docker / kubectl commands |
| `code-style-conventions.md` | TypeScript/React/Next, ETHON tokens, secrets |
| `review-guidelines.md` | Security, diffs, version pinning, pixel fidelity |
| `documentation-files.md` | README, OVERVIEW, INTERFACES, DEPLOYMENT, CONTRIBUTING, CHANGELOG |
| `github-project.md` | GitHub Project status transitions |

Worklog template: `.claude/worklog-template.md` — copy it as the starting point for every new worklog. Each milestone ends in a buildable, shippable state and writes a newest-on-top block to `.claude/memory/MEMORY.md` so any later session can resume.
