# homelab-furchert-ch — Overview

> Stub — filled in parallel with each milestone (see `.claude/rules/documentation-files.md`).

## What this is

`furchert-ch` is the homelab's single Next.js frontend: a public personal website
plus a private, OIDC-gated control surface for the cluster. One frontend serves the
whole cluster — there is no separate admin app.

## Surfaces

### Public (real)
| Route | Page |
|-------|------|
| `/[locale]` | Home (hero, experience/engagement, teasers, stats, CTA) |
| `/[locale]/about` | About (bio, facts, timeline, interests) |
| `/[locale]/it` | IT & Tech |
| `/[locale]/rowing` | Rowing |
| `/[locale]/projects`, `/projects/[slug]` | Projects + detail |
| `/[locale]/contact` | Contact |

Locales: `de` (default) and `en`; `/` redirects to `/de`. Each public route
emits locale-aware `<title>` / `<meta description>` and hreflang alternates;
`/robots.txt` and `/sitemap.xml` are served from `src/app/{robots,sitemap}.ts`
(sitemap covers every public route × locale; robots disallows `/dashboard`
including the locale-prefixed variants).

The contact form posts to a typed `'use server'` action that validates and
server-logs the submission (Phase 7 wires real delivery — Formspree or a
dedicated API route). The success state renders only on a real
`{ok:true}` response; thrown / invalid responses surface a visible error.

### Automation

| Route | Page | Status |
|-------|------|--------|
| `/[locale]/automation` | Business landing (real product) | real, indexable |
| `/[locale]/automation/scan` | 4-step scan wizard (visual preview) | **mockup**, `robots:noindex`, sitemap-excluded |

The landing page is real product. The scan wizard is a **clearly-labelled
visual preview** — every step carries a persistent "Demo / Mockup" banner
and Step 4 is marked as a "Beispiel-Report / Sample report". The wizard
performs no network calls, runs no Claude API, has no `/api/scan/*` route,
and stores nothing. Step-3 contact fields are not transmitted; copy says
so explicitly. Master-plan Phase 7 wires real delivery for the contact
form; the scan is intentionally not part of that plan.

### Private (real, OIDC-gated via auth.furchert.ch)
| Route | Page | Status |
|-------|------|--------|
| `/[locale]/dashboard` | Homelab overview: Dev Area subnav, k3s cluster strip, filterable app/service tile grid, infra shortcuts | **live (Phase 5)** — Auth/Device subnav tabs and per-tile "Manage" buttons are visibly disabled until Phase 6 |
| `/[locale]/dashboard/auth` | auth-service admin GUI (real REST API) | Phase 6 |
| `/[locale]/dashboard/devices` | device-service admin GUI (real REST API) | Phase 6 |

`/dashboard` is gated by **real OIDC** (Auth.js v5 → auth.furchert.ch, Auth Code +
PKCE). The authoritative gate is a server-side `auth()` check in the page (and, in
Phase 6, in every admin route handler with `role === 'ADMIN'`). OIDC access/ID
tokens never reach the browser; sign-out ends the IdP session. See `INTERFACES.md`
§1 and `DEPLOYMENT.md` for the client contract and required secrets.

## Real vs. mock vs. deferred

- **Real:** public site (incl. the `/automation` landing page), OIDC dashboard auth, dashboard overview, admin GUIs wired to backend.
- **Mock:** the `/automation/scan` wizard only (clearly-labelled visual preview, `robots:noindex`, sitemap-excluded).
- **Sample (labelled, not live):** the dashboard cluster strip (CPU/MEM/status)
  and app/service status badges are static demo data, shown with a visible
  "Sample data / Beispieldaten" badge until real telemetry lands (issue #17).
- **Placeholder:** footer **Impressum** / **Datenschutz** render as
  non-interactive placeholders until the real pages exist (issue #16).
- **Deferred (out of scope for now):** AI scan backend, lead dashboard, rate
  limiting/Turnstile, n8n notifications, live cluster metrics, WebSocket device
  stream. Tracked here as work progresses.

(Detailed feature/route descriptions added per milestone.)
