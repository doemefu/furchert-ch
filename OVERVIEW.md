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
| Route | Page |
|-------|------|
| `/[locale]/dashboard` | Homelab overview (cluster nodes, app/service tiles) |
| `/[locale]/dashboard/auth` | auth-service admin GUI (real REST API) |
| `/[locale]/dashboard/devices` | device-service admin GUI (real REST API) |

## Real vs. mock vs. deferred

- **Real:** public site, OIDC dashboard auth, dashboard overview, admin GUIs wired to backend.
- **Mock:** the entire `/automation` section.
- **Deferred (out of scope for now):** AI scan backend, lead dashboard, rate
  limiting/Turnstile, n8n notifications, live cluster metrics, WebSocket device
  stream. Tracked here as work progresses.

(Detailed feature/route descriptions added per milestone.)
