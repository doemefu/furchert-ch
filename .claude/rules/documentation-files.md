# Documentation Files — Purpose & Owner

When making changes, update the relevant file(s) — the `doc-auditor` subagent (Phase 6) identifies what needs updating. Docs are written in parallel with the code change, not after.

| File              | Audience      | Covers |
|-------------------|---------------|--------|
| `README.md`       | Everyone      | Landing page — documentation index, quick start, quick reference |
| `OVERVIEW.md`     | Everyone      | What the site is, public + private surfaces, routes, deferred/out-of-scope (incl. automation = mock) |
| `INTERFACES.md`   | Integrators   | Which backend endpoints this frontend consumes (auth-service OIDC + REST, device-service REST), and the OIDC client contract |
| `DEPLOYMENT.md`   | App devs      | Docker build, k8s manifests, Flux wiring, Cloudflare Tunnel, required secrets/env, troubleshooting |
| `CONTRIBUTING.md` | Contributors  | Local dev setup (pnpm, local OIDC, port-forwards), lint/build, PR process |
| `CHANGELOG.md`    | Users         | Notable changes per milestone |
| `docs/INDEX.md`   | Everyone      | Index of supplementary `docs/` material |

**Rule:** never document what was planned if it differs from what was built — read the actual files first.
