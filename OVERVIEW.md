# homelab-furchert-ch — Overview

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

The contact form posts to a typed `'use server'` action that validates the
input, applies a honeypot and an in-process rate limiter, then delivers the
message by authenticated SMTP (Infomaniak, `mail.infomaniak.com:587`) to
`info@furchert.ch` with the submitter set as Reply-To. The success state
still renders only on a real `{ok:true}` response (returned only once the
mail server accepts the message), and invalid input / rate limiting / a
delivery failure each surface a distinct visible error.

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
so explicitly. The contact form now delivers real mail (see above); the scan
wizard remains intentionally out of that scope and must never import the
mailer.

### Private (real, OIDC-gated via auth.furchert.ch)
| Route | Page | Status |
|-------|------|--------|
| `/[locale]/dashboard` | Homelab overview: Dev Area subnav, k3s cluster strip, filterable app/service tile grid, infra shortcuts | **live (Phase 5)** — Auth/Device subnav tabs and per-tile "Manage" buttons are visibly disabled until Phase 6 |
| `/[locale]/dashboard/network` | Network monitoring (ADMIN only): collector status strip, inbound Cloudflare traffic (totals, timeline, top client IPs, countries, ASNs, hosts, paths, status codes), firewall events, IP detail via `?ip=`, LAN section (connections per port by source, UFW blocks as a lower bound, SSH auth outcomes), egress section (top external destinations per workload with FQDN or IP, bytes sent/received, connects, "new" badge), logins section (outcome totals, stacked timeline, top source IPs by failed and locked attempts, accounts, login events filterable by outcome with paging); window `?window=24h\|7d\|30d` | **live (NM-1, #61; LAN NM-3, #62; egress NM-2, #63; logins NM-4, #64)** — data from data-service (`INTERFACES.md` §2); non-ADMIN users see a "no access" state |
| `/[locale]/dashboard/auth` | auth-service admin GUI (real REST API) | Phase 6 |
| `/[locale]/dashboard/devices` | device-service admin GUI (real REST API) | Phase 6 |

`/dashboard` is gated by **real OIDC** (Auth.js v5 → auth.furchert.ch, Auth Code +
PKCE). The authoritative gate is a server-side `auth()` check in the page (and, in
Phase 6, in every admin route handler with `role === 'ADMIN'`). ADMIN-only pages
(`/dashboard/network` today) additionally check `asRole(session.user?.role) ===
'ADMIN'` in the page and render the shared `NoAccess` state otherwise. OIDC access/ID
tokens never reach the browser; sign-out ends the IdP session. See `INTERFACES.md`
§1 and `DEPLOYMENT.md` for the client contract and required secrets.

## Security posture

Every route (public pages, `/dashboard`, and `/api/*`) carries hardening
response headers (`X-Content-Type-Options`, `Referrer-Policy`,
`X-Frame-Options`, `Permissions-Policy`, `Strict-Transport-Security`) plus a
`Content-Security-Policy-Report-Only` baseline — headers-only slice of issue
#42, shipped via `next.config.mjs` `headers()`. See `DEPLOYMENT.md` §
"Security headers" for the exact values, the HSTS rollout plan, and the CSP
graduation gate (dropping `-Report-Only` once a manual DevTools pass shows no
unexpected violations). The "first automated tests" half of #42 remains open
— this repo has no test-framework dependency yet.

## Real vs. mock vs. deferred

- **Real:** public site (incl. the `/automation` landing page), OIDC dashboard auth, dashboard overview with live cluster/app metrics (see the "Live" bullet below); the contact form delivers real mail by SMTP (Infomaniak). Admin GUIs for auth-service / device-service are Phase 6, upcoming — not wired yet.
- **Mock:** the `/automation/scan` wizard only (clearly-labelled visual preview, `robots:noindex`, sitemap-excluded).
- **Live (issue #17):** the dashboard cluster strip (per-node CPU/MEM/status)
  and workload-backed app/service status badges are fetched from Prometheus
  server-side at request time (see `INTERFACES.md` §2). When Prometheus is
  unreachable or returns nothing, the dashboard shows the known node hardware
  with honest "—" placeholders, `unknown` status dots, and a visible
  "unavailable" note — never fabricated numbers.
- **Live (NM-1, #61):** `/dashboard/network` reads data-service's netmon API
  server-side with a client-credentials token (see `INTERFACES.md` §2). Each
  section degrades independently to an honest "unavailable" / HTTP-error note;
  IP addresses are shown to ADMIN sessions only and are never logged. The LAN
  section (NM-3, #62) shows "not yet available" until data-service serves
  `/lan/*`, and "no LAN data yet" until the node collector role is rolled out.
  The egress section (NM-2, #63) shows "not yet available" until data-service
  serves `/egress/top`, and "no egress data yet" while the `egress` collector
  has never succeeded (coroot node agent not rolled out). The logins section
  (NM-4, #64) shows "not yet available" until data-service serves `/logins/*`,
  and "no login data yet" while auth-service's login-event outbox is not
  enabled; attempted usernames are never shown, only an 8-character hash tag.
- **Placeholder:** footer **Impressum** / **Datenschutz** render as
  non-interactive placeholders until the real pages exist (issue #16).
- **Deferred (out of scope for now):** AI scan backend, lead dashboard,
  Turnstile / a shared (multi-replica-safe) rate limiter, n8n notifications,
  WebSocket device stream. Tracked here as work progresses.

(Detailed feature/route descriptions added per milestone.)
