# furchert-ch

The single web frontend for the doemefu homelab — Dominic Furchert's personal site
**and** the authenticated control surface for the cluster.

- **Public site:** Home · About · IT · Rowing · Projects · Automation · Contact (DE/EN)
- **Private `/dashboard`** (OIDC-gated via `auth.furchert.ch`): homelab overview +
  integrated admin GUIs for `homelab-auth-service` and `homelab-device-service`.
- **`/automation` (incl. `/automation/scan`) is a visual mockup only** — no backend.

Stack: Next.js (App Router, TypeScript), next-intl, Auth.js (OIDC). Deployed to k3s
`apps` namespace via Flux CD behind Cloudflare Tunnel.

## Status

Bootstrapping. Build order and current state: see `.claude/memory/MEMORY.md`
(newest entry first) and the approved implementation plan
`~/.claude/plans/fetch-this-design-file-encapsulated-diffie.md`.

| Phase | Scope | State |
|-------|-------|-------|
| 0 | Claude scaffold + repo conventions | done |
| 1 | Next.js skeleton + ETHON design system | done |
| 2 | Public pages | done |
| 3 | Automation section (mockup) | done |
| 4 | Real OIDC dashboard auth | done |
| 5 | Dashboard shell | done |
| 6 | Integrated admin GUIs | pending |
| 7 | Deployment (Flux CD + Cloudflare Tunnel) | pending |

## Documentation

| File | What |
|------|------|
| `OVERVIEW.md` | What the site is; public/private surfaces; real vs. mock vs. deferred |
| `INTERFACES.md` | Backend endpoints consumed; OIDC client contract |
| `DEPLOYMENT.md` | Docker, k8s, Flux, Cloudflare Tunnel, required secrets |
| `CONTRIBUTING.md` | Local dev (pnpm, local OIDC, port-forwards), lint/build, PR flow |
| `CHANGELOG.md` | Notable changes per milestone |
| `docs/INDEX.md` | Index of supplementary docs |
| `CLAUDE.md` | Guidance for Claude Code; process rules in `.claude/rules/` |

## Quick start

> Application code lands in Phase 1. Until then this repo contains only the working
> conventions. After Phase 1:

```bash
pnpm install
pnpm dev        # http://localhost:3000
```
