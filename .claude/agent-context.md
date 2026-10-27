# Agent context — furchert-ch

Repo-specific additions for the `homelab-workflow` plugin agents; each agent reads only its own section. `furchert-ch` is the homelab's single Next.js 16 frontend (pnpm, ESLint 9 flat config): a public DE/EN site plus an OIDC-gated `/dashboard`. It deploys to k3s `apps` via Flux behind Cloudflare Tunnel.

## architect

- Output goes to `INTERFACES.md` (route/component/API-usage contract); for cross-repo work also a spec under `../docs/`.
- Read first: `docs/INDEX.md`, and the prototype source for the area in scope (design bundle: `shared.jsx`, `pages.jsx`, `dashboard.jsx`, `auth-admin.jsx`, `device-admin.jsx`), which is authoritative for layout and styling. The old `furchert-ch-website-spec.md` is superseded; never follow it.
- For dashboard/admin work also read `../auth-service/INTERFACES.md` and `../device-service/INTERFACES.md`. Do not invent backend endpoints; only those documented there (and `../data-service/INTERFACES.md` for `/dashboard/network`).
- Per area the contract must define: route(s) (App Router path, locale handling) and which are public vs. OIDC-gated; component tree (props, data source `src/data/*` / i18n / backend, client vs. server component); i18n keys added (de/en) and static data modules touched.
- For backend-connected surfaces: exact upstream endpoints (method, path, auth, request/response shape), the Next route handler that proxies them (so the OIDC access token stays server-side), and the role gating (`role=ADMIN` for admin writes).
- Surfaces with no real endpoint must be explicit labelled placeholders.
- Confirm explicitly that `/automation` and `/automation/scan` stay non-functional mockups when in scope.

## implementer

- Read the exported Claude Design prototype (ETHON) in addition to the contracts, and recreate it pixel-faithfully (spacing, fonts, borders, the `.border-x` grid); restructure internals only where Next/RSC requires it.
- Server Components by default; `'use client'` only where interactivity needs it. Shared types in `src/types/`, component-only types co-located.
- Styling: ETHON tokens from `src/styles/globals.css` via CSS variables (`var(--blue-base)`, `var(--n-60)`, ...). No UI kit, no second styling system.
- Copy via next-intl (`src/i18n/messages/{de,en}.json`), static content typed in `src/data/`; no hardcoded UI strings. Both locales must work; `/` redirects to `/de`.
- Backend calls only from server route handlers (`src/app/api/...`) or server components, using cluster-internal FQDNs. Never expose the OIDC access token to the browser. Gate OIDC routes server-side (session + role check), not only in the UI.
- `/automation` and `/automation/scan` stay non-functional mockups: no Claude API, no `/api/scan/*`, no persistence, no outbound calls; mark it in UI and code comments.
- Verification: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`. Record results in the worklog.
- Each milestone ends buildable and shippable.
- Tell the reviewer "[area] is ready for review"; after approval, tell devops if Dockerfile/k8s/Flux wiring is affected.

## reviewer

Review in addition to the generic checklist:
- OIDC access tokens never reach the browser; OIDC-gated routes enforced server-side; admin write actions gated on `role=ADMIN` per the service `INTERFACES.md` files.
- Pixel fidelity: the UI matches the prototype source for the touched page (tokens, spacing, `.border-x` grid) in DE and EN.
- Backend request/response shapes match `../auth-service/INTERFACES.md` / `../device-service/INTERFACES.md`; surfaces without a real endpoint are labelled placeholders, never fabricated "live" data.
- `/automation` stays a mockup: no outbound network calls, no scan API routes, no fake success.
- Server vs. client components used appropriately; data fetched server-side.
- No `.env*` with values committed; k8s uses `secretKeyRef`.
- Dependency versions pinned (no `^`/`~`), Docker base image pinned.
- k8s manifests (if touched): resource `requests`+`limits`, liveness+readiness probes, namespace `apps`, image not `latest`.
- Review path: there is no CodeRabbit on this repository (confirmed 2026-08-28). When Copilot quota is exhausted, this reviewer plus `/code-review` is the fallback; the PR needs a comment stating which review path was used.

## documenter

- Docs: `README.md` (index, quick start, route map), `OVERVIEW.md` (public + private surfaces; state clearly what is real, mock or deferred; automation stays listed as mock), `INTERFACES.md` (consumed backend endpoints, OIDC client contract), `DEPLOYMENT.md` (Docker/k8s/Flux/Cloudflare Tunnel, required secrets/env), `CONTRIBUTING.md` (local dev: pnpm, local OIDC, port-forwards, lint/build, PR flow), `CHANGELOG.md` (one entry per shipped milestone), `docs/INDEX.md` (index of supplementary docs).
- Read the implemented files first; never document what was planned if it differs from what was built.
- Keep `CLAUDE.md` concise.

## devops

- Files: `Dockerfile`, `.dockerignore` (multi-stage Next standalone build, pinned base image); `k8s/deployment.yaml` (contains the Service, no separate `service.yaml`) and `k8s/kustomization.yaml`, namespace `apps`; `.github/workflows/` (build + push `ghcr.io/doemefu/furchert-ch:main-<ts>`, mirroring the auth-service tag pattern).
- In `../infrastructure/`: `cluster/apps/furchert-ch/` (source/imagerepo/imagepolicy/imageupdate/sync/kustomization) and the Cloudflare Tunnel ingress in `cf_ingress_body` in `infra/playbooks/40_platform.yml`. Changes there follow that repo's workflow (own branch + PR).
- `replicas: 1`; `requests` + `limits`; liveness + readiness probes. Image tag is a Flux setter (`# {"$imagepolicy": "flux-system:furchert-ch"}`), never `latest`.
- Config via env; secrets via `secretKeyRef` from the existing `furchert-ch-secrets` k8s secret (keys include `OIDC_CLIENT_SECRET`, `AUTH_SECRET`). Required env is read from the code and `.env.local.example`. Report secret key names only, never values; SOPS files are the user's to edit.
- Cluster-internal upstreams: `auth-service.apps.svc.cluster.local:8080`, `device-service.apps.svc.cluster.local:8081`.
- Validate: `docker build -t furchert-ch .`, `kubectl apply --dry-run=client -k k8s/`, kustomize render of the infra app dir.

## plan-reviewer

Additional checks:
- Secrets and auth: OIDC access token stays server-side; OIDC-gated routes enforced server-side; admin writes require `role=ADMIN`; no `.env` committed, k8s env via `secretKeyRef`.
- Automation = mockup: plan keeps `/automation` and `/automation/scan` non-functional (no Claude API, no `/api/scan/*`, no persistence, no accidental backend wiring).
- Backend integration: consumed endpoints exist in `../auth-service/INTERFACES.md` / `../device-service/INTERFACES.md` (not invented); shapes correct; failure handled (backend down, 401/403); surfaces without an endpoint are explicit placeholders.
- Design fidelity: pixel-faithful recreation of the prototype (tokens, `.border-x` grid, DE+EN), not a redesign; the superseded `furchert-ch-website-spec.md` is not followed by mistake.
- Next.js: server/client split correct, data fetched server-side, both locales handled, `/` to `/de` redirect intact, no required in-memory state across pod restarts.
- Failure mode question: what does the user see if auth-service or device-service is unavailable?
- Resumability: milestone ends buildable and shippable.

## doc-auditor

- Audit in full: `README.md`, `OVERVIEW.md`, `INTERFACES.md`, `DEPLOYMENT.md`, `CONTRIBUTING.md`, `CHANGELOG.md` (and `docs/INDEX.md` if supplementary docs changed).
- `README.md`: new route/page, milestone status, new prerequisite, index still accurate.
- `OVERVIEW.md`: new public/private surface; change in real vs. mock vs. deferred (automation must stay listed as mock); route map accurate.
- `INTERFACES.md`: new backend endpoint consumed; OIDC client contract change (redirect URIs, scopes, secret env name).
- `DEPLOYMENT.md`: new env var or secret key; Dockerfile/k8s/Flux/Cloudflare Tunnel change; new troubleshooting case.
- `CONTRIBUTING.md`: new local-dev step (pnpm script, local OIDC, port-forward), new test type/command, new CI workflow.
- `CHANGELOG.md`: one entry per shipped milestone (this repo logs milestones; check its heading convention rather than assuming `[Unreleased]`).
- Project context: public personal site + OIDC-gated `/dashboard` (homelab overview) and ADMIN-only `/dashboard/network` (data-service); auth/device admin GUIs planned; `/automation` is a mockup.
