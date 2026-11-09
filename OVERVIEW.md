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
| `/[locale]/projects`, `/projects/[slug]` | Projects + detail. `/projects/homelab` also shows what runs in the homelab (static showcase, public repos only) and a live status of six public services (up/down, 14-day availability) from `GET /api/homelab-status`; unknown when Prometheus is unavailable (`INTERFACES.md` §2 "Prometheus") |
| `/[locale]/contact` | Contact |
| `/[locale]/imprint` | Impressum / Imprint (#16; name + e-mail, no postal address) |
| `/[locale]/privacy` | Datenschutz / Privacy (#16; copy in `src/data/legal.ts`) |

Locales: `de` (default) and `en`; `/` redirects to `/de`. Each public route
emits locale-aware `<title>` / `<meta description>`, a self-referencing
canonical, hreflang alternates (`de`, `en`, `x-default` → German) and
OpenGraph/Twitter tags via `buildPageMetadata` (`src/lib/seo/metadata.ts`);
hreflang lives only in the HTML and the sitemap (no middleware `Link` header).
JSON-LD: `WebSite` + `Person` on the home page, `ProfilePage` on `/about`,
`WebPage`/`FAQPage` + `Service` on `/automation`, `WebPage` on
`/projects/homelab` (`src/lib/seo/jsonLd.ts`).
`/robots.txt` and `/sitemap.xml` are served from `src/app/{robots,sitemap}.ts`
(sitemap covers every public route × locale with each page's last-modified date
from `src/lib/seo/pages.ts`; robots disallows `/dashboard` including the
locale-prefixed variants and states the Content Signals). `/llms.txt` is a
static summary for AI tools (`public/llms.txt`).

The contact form (Sie form, #145) asks for a topic (live demo or something
else), name, e-mail, «Rückruf gewünscht» with a phone number, an optional
message and an optional «Wie sind Sie auf mich aufmerksam geworden?». The call
back starts unchecked; the «Rückruf anfordern» link on `/automation`
(`?from=automation-callback`) pre-ticks it; whenever it is ticked, the e-mail
is optional and the phone required. The page stays static: the form reads
`?from=<id>` in the browser, keeps it only if it is on `FROM_IDS` (`src/data/contact-sources.ts`),
sends it with the enquiry and removes it from the address bar; no cookie, no
storage. It posts to a typed `'use server'` action that validates the input
(phone: 9 to 15 digits; unknown `from`/source values are dropped), applies a
honeypot and an in-process rate limiter, then delivers the message by
authenticated SMTP (iCloud, `smtp.mail.me.com:587`) to `info@furchert.ch`,
with the submitter as Reply-To when an e-mail is given and «Quelle:» /
«Aufmerksam geworden:» lines for counting enquiries per button
(`INTERFACES.md` §3). The success state still renders only on a real
`{ok:true}` response (returned only once the mail server accepts the
message), and invalid input, an invalid phone, rate limiting and a delivery
failure each surface a distinct visible error.

### Automation

| Route | Page | Status |
|-------|------|--------|
| `/[locale]/automation` | Offer page for construction and civil engineering firms (Gate 0, #145) | real, indexable; static, no AI backend |
| `/automation/scan`, `/[locale]/automation/scan` | retired (#143, #145) | 308 redirect to the locale's `/automation` |
| `/ki`, `/bau` | vanity URLs for print and talks | 307 redirect to `/de/automation` |

The offer page is static: no Claude API, no AI endpoint, no persistence. Its
three example tiles (native `<details>`, no client JS), the before/after
example and the sample calculation are illustrative and labelled as invented.
Client JS on the page is limited to the FAQ accordion, the e-mail button (`ContactEmail`, below) and, on phones (≤ 820 px), a sticky call to action (`StickyCta`, rendered through a portal after hydration). It appears once the hero has scrolled out and hides at the closing call to action and the footer; without JS there is no bar.
Every contact button links to `/contact?from=<id>` (`src/data/contact-sources.ts`; the home page's CTA strip uses `home-cta`); the closing section also offers a `mailto:` button whose address exists only in the browser (`ContactEmail`, #147; without JS it links to the contact page). The hero and the closing section also link «Rückruf anfordern» (`automation-callback`), which ticks «Rückruf gewünscht» on the contact form. The price FAQ is visible but left out of the FAQPage JSON-LD. The
redirects live in `next.config.mjs` (pinned by `src/redirects.test.ts`).
Nothing under `/automation` imports the mailer.

### Private (real, OIDC-gated via auth.furchert.ch)
| Route | Page | Status |
|-------|------|--------|
| `/[locale]/dashboard` | Homelab overview: Dev Area subnav, k3s cluster strip, filterable app/service tile grid, infra shortcuts | **live (Phase 5)** — the Auth Service subnav tab and its tile's "Manage" link open `/dashboard/auth` (#44); the Device Service tab and the IoT Platform "Manage" link open `/dashboard/devices` (#45) |
| `/[locale]/dashboard/network` | Network monitoring (ADMIN only): collector status strip, inbound Cloudflare traffic (totals, timeline, top client IPs, countries, ASNs, hosts, paths, status codes), firewall events, IP detail via `?ip=`, LAN section (connections per port by source, UFW blocks as a lower bound, SSH auth outcomes), egress section (top external destinations per workload with FQDN or IP, bytes sent/received, connects, "new" badge), logins section (outcome totals, stacked timeline, top source IPs by failed and locked attempts, accounts, login events filterable by outcome with paging); window `?window=24h\|7d\|30d` | **live (NM-1, #61; LAN NM-3, #62; egress NM-2, #63; logins NM-4, #64)** — data from data-service (`INTERFACES.md` §2); non-ADMIN users see a "no access" state |
| `/[locale]/dashboard/analytics` | Web analytics (ADMIN only, #155 WA-4a): status strip, offer at a glance (KPI tiles with the small-number rules, daily chart), funnels, pages (cards on phones) with a drilldown incl. previous/next pages, clicks, sources, paths, audience, coverage and data quality (#156 WA-4b); "this browser" never-track switch. Reads data-service's aggregates server-side (`analytics:read`) | **live, empty until the rollup has a final day** — consented data only arrives after the WA-6 go-live |
| `/[locale]/dashboard/services` | Service utilization and availability (ADMIN only): one row per Deployment/StatefulSet in `apps` and `homeassistant` (minus an exclude list), CPU and MEM as a share of the highest container's limit (request as marked fallback), a 14-day availability strip (13 full Europe/Zurich days + today; colour = availability and restarts) whose today bar expands a last-24-hours hourly strip, availability and restart totals for 24 h and 14 d | **live (#47)** — live Prometheus (`INTERFACES.md` §2 "Prometheus"); non-ADMIN users see a "no access" state |
| `/[locale]/dashboard/auth` | auth-service admin GUI (ADMIN only): tabs `?tab=overview\|users\|clients\|sessions\|jwks\|audit`; UP/DOWN health pill; users list (50/page) with search/filters, create, edit, delete and admin password reset; device clients list/register/revoke with the generated secret shown exactly once; JWKS keys; Sessions & tokens and Audit log are labelled "not available" placeholders (no auth-service API) | **live (#44)** — real auth-service REST API with the admin's own access token (`INTERFACES.md` §2 "auth-service"); the Users tab shows "not available yet" until doemefu/homelab-auth-service#115; sessions from before #44 get a "sign in again" notice; non-ADMIN users see "no access" |
| `/[locale]/dashboard/devices` | device-service admin GUI (ADMIN only): tabs `?tab=overview\|devices\|schedules`; UP/DOWN health pill; overview tiles (devices live, last message, active schedules, next run) and a plain "no device is reporting" notice; one card per device with its last known state, its age ("live" only when the last message is under 10 minutes old) and switch on/off for light, night light and rain — locked with the reason shown unless the device is live, because commands are not stored by the broker; schedules list with create, edit, delete and an active switch, cron presets (daily at a Zurich time, every n minutes) plus a raw field, device-service's own validation messages under the field and its `nextRun` as the confirmation after saving. Registering and deleting devices are not part of this slice | **live (#45 slice 1)** — real device-service REST API with the admin's own access token (`INTERFACES.md` §2 "device-service"); a stale session gets a "sign in again" notice; non-ADMIN users see "no access" |

`/dashboard` is gated by **real OIDC** (Auth.js v5 → auth.furchert.ch, Auth Code +
PKCE). The authoritative gate is a server-side `auth()` check in the page (and in
every admin Server Action, which repeats the session + `role === 'ADMIN'` +
access-token checks). ADMIN-only pages
(`/dashboard/network`, `/dashboard/services`, `/dashboard/auth`, `/dashboard/devices`) additionally check `asRole(session.user?.role) ===
'ADMIN'` in the page and render the shared `NoAccess` state otherwise. OIDC access/refresh/ID
tokens live only on the encrypted httpOnly session JWT and never reach the browser; sign-out ends the IdP session. See `INTERFACES.md`
§1 and `DEPLOYMENT.md` for the client contract and required secrets.

## Security posture

Every route (public pages, `/dashboard`, and `/api/*`) carries hardening
response headers (`X-Content-Type-Options`, `Referrer-Policy`,
`X-Frame-Options`, `Permissions-Policy`, `Strict-Transport-Security` 1 year),
an enforced `Content-Security-Policy` for the directives that do not depend on
inline scripts or styles (`frame-ancestors`, `object-src`, `base-uri`,
`form-action`), and a `Content-Security-Policy-Report-Only` policy for the rest
— issue #42, shipped via `next.config.mjs` `headers()` (no `X-Powered-By`).
See `DEPLOYMENT.md` § "Security headers" for the exact values, the HSTS rollout,
and the CSP graduation gate for `script-src`/`style-src` (owner decision on #42). Since #44 the repo has unit tests (vitest 5.0.5, `pnpm test`,
`src/**/*.test.ts`, run in CI before `pnpm build`) covering the auth-admin
token, client, form and Server Action logic; whether that closes the "first
automated tests" half of #42 is tracked on that issue.

## Real vs. mock vs. deferred

- **Real:** public site (incl. the `/automation` offer page), OIDC dashboard auth, dashboard overview with live cluster/app metrics and the `/dashboard/services` utilization page (see the "Live" bullets below); the contact form delivers real mail by SMTP (iCloud). The auth-service admin GUI `/dashboard/auth` (#44) and the device-service admin GUI `/dashboard/devices` (#45 slice 1) are real.
- **Mock:** the example tiles, the before/after example and the sample calculation on `/automation` (labelled as invented; no AI backend). The `/automation/scan` wizard is retired and redirects (#145).
- **Live (issue #17):** the dashboard cluster strip (per-node CPU/MEM/status)
  and workload-backed app/service status badges are fetched from Prometheus
  server-side at request time (see `INTERFACES.md` §2). When Prometheus is
  unreachable or returns nothing, the dashboard shows the known node hardware
  with honest "—" placeholders, `unknown` status dots, and a visible
  "unavailable" note — never fabricated numbers.
- **Live (#47):** `/dashboard/services` reads Prometheus server-side at request time (five queries, one of them a 14-day `query_range`; see `INTERFACES.md` §2). A failed or empty query group shows "—" / grey bars plus one "partial" notice; a missing workload inventory shows an "unavailable" notice — nothing is fabricated. Limits: availability reflects desired vs. available replicas, so there is no OOMKilled signal; history is bounded by Prometheus retention (14 d; a longer window needs doemefu/homelab#247).
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
  and "no login data yet" while the `login-events` collector has no source
  data (e.g. auth-service's outbox not enabled); attempted usernames are never shown, only an 8-character hash tag.
- **Live (#44):** `/dashboard/auth` calls auth-service's admin REST API server-side with the signed-in admin's own access token (refreshed in memory). Every failure renders an honest state ("sign in again", "ADMIN role required", "not available yet", "auth-service unavailable", "unexpected response"); Sessions & tokens and the audit log are labelled "not available" placeholders, never fabricated data.
- **Live (#45 slice 1):** `/dashboard/devices` calls device-service's REST API server-side with the same admin access token. Device values are labelled "last reported" unless the device is live; a successful command says "sent", not "done". Failures render honest states ("sign in again", "ADMIN role required", "device-service unavailable", "unexpected response"). Device registration and deletion follow in a later slice.
- **Built, dark (#153, WA-2a of Epic doemefu/homelab#348):** the usage-statistics consent bar, the footer "Privacy settings" button and the consent controller, the tracker and the collect route `POST /api/v` with its bot drop and rate limits, the forget route `POST /api/v/forget` with durable erasure in data-service, and the GPC/DNT auto-decline exist in the code but stay off (`ANALYTICS_UI_ENABLED = false` in `src/lib/analytics/flags.ts`) until the WA-6 go-live (#158) (#153, #154, #157). **Live:** the id-free daily enquiry count: every successful contact submission forwards one `enquiry` event to data-service (no identifier, no content); goal and enquiry use their own priority lane in the forward queue (#157). No privacy-text change yet (prepared for WA-6).
- **Deferred (out of scope for now):** any AI backend for `/automation`, lead dashboard,
  Turnstile / a shared (multi-replica-safe) rate limiter, n8n notifications,
  WebSocket device stream. Tracked here as work progresses.

(Detailed feature/route descriptions added per milestone.)
