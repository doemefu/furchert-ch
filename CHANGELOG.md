# Changelog — homelab-furchert-ch

All notable changes per milestone. Newest first.

## [Unreleased]

### Added

- **Web analytics abuse limits, durable erasure and GPC/DNT, shipped dark**
  (#157, WA-5 of Epic doemefu/homelab#348). Everything below stays off
  until `ANALYTICS_UI_ENABLED` flips in WA-6, except the forward-queue
  change, which the live enquiry count already uses.
  - `POST /api/v` drops bots and prefetch requests and is rate-limited per
    client (IPv6 /64) and globally (429 with `Retry-After`); at most 5 new
    visitor ids per hour and client.
  - `POST /api/v/forget` has its own limits and now erases the visitor's
    events in data-service. If data-service is down, the answer is 503 and
    the `fa_forget` cookie keeps the ids for a later retry; failed ids are
    also retried in the background for 24 h.
  - The forward queue gives goal and enquiry their own lane, keeps sending
    them while data-service caps analytics events, and never resends an
    erased visitor's events.
  - Browsers with Global Privacy Control or Do Not Track are declined
    automatically, with one forget; an explicit Allow overrides the signal.
  - The tracker honours `Retry-After` on a rate-limited collect.

  Needs data-service #56 to be live. No new dependency.

- **Web analytics dashboard, remaining sections** (#156, WA-4b of Epic
  doemefu/homelab#348): `/dashboard/analytics` gains funnels (offer and
  contact form, step rates, "< 3" for small steps, rate comparison only on a
  previous period of the same length), paths (page-group paths, entry and
  exit pages, seen before contacting, page transitions), audience (new and
  returning visits, repeat offer viewers, device, entry language and
  dimension lists), coverage and data quality (consented page views next to
  Cloudflare page requests, an indicative 10-point band, enquiries by
  submission day, registry pages only, data-quality reasons), and previous
  and next pages in the page drilldown. The page explains when the current
  counting rules or the go-live date shorten a range. The pages table turns
  into cards on phones. Needs data-service #55; without it these sections
  show "data-service error". No new dependency.

- **Web analytics dashboard, core sections** (#155, WA-4a of Epic
  doemefu/homelab#348): ADMIN-only `/dashboard/analytics` with a new subnav
  tab. Range controls (7/28/90 days, rolling 12 months, custom), compare,
  entry-locale and device filters; a status strip; offer at a glance (six
  tiles with the small-number rules: "x of n" below 30, a 95 % range up to
  199, deltas only when clear; enquiries as two counts); pages with a
  drilldown (clicks, daily views, `/automation` section reach and FAQ
  opens); clicks with a kind filter; sources. Funnels, paths, audience and
  coverage follow in WA-4b. A "never track this browser" switch, also usable
  while the usage statistics are not live yet. Data comes from data-service's
  read API server-side (scope `analytics:read`); every value renders as text.
  The page stays empty ("no complete day yet") until the nightly rollup has
  a final day. No new dependency.

- **Web analytics tracker, collect route and enquiry count, shipped dark**
  (#154, WA-2b of Epic doemefu/homelab#348): the consented tracker (its own
  async chunk, loaded only after Allow), the same-origin collect route
  `POST /api/v` with the WA-2b safety steps, the cookie-only
  `POST /api/v/forget`, and an in-memory forward queue to data-service
  (`analytics:write`). Everything browser-side stays off while
  `ANALYTICS_UI_ENABLED` is false. **Live from this release:** every
  successful contact submission without a session cookie adds one id-free
  `enquiry` to data-service's daily count; a contact goal is recorded only
  once tracking is live and allowed. Click and section ids on the pages
  (`data-track`, `data-track-section`); the `/ki` and `/bau` short links now
  carry `utm_source=print&utm_medium=shortlink&utm_campaign=ki|bau`. The
  contact mail's «Quelle:» line can now also show `about-contact` and
  `rowing-contact` (the contact buttons on `/about` and `/rowing`). New env
  `ANALYTICS_COLLECT_ENABLED` (kill switch, plain value). The client-credentials
  token cache is shared by netmon and analytics. The bundle budget test also
  checks the tracker chunk. No new dependency.

- **Usage-statistics consent bar and privacy settings, shipped dark** (#153,
  WA-2a of Epic doemefu/homelab#348): a bottom consent bar (copy draft per
  spec 100 §10.1, de/en), a footer "Datenschutz-Einstellungen" / "Privacy
  settings" button that shows the current choice and reopens the bar, and the
  consent controller behind them (`src/lib/analytics/`). Nothing is visible
  or sent: `ANALYTICS_UI_ENABLED` is `false` until the WA-6 go-live (#158),
  and the dark build loads none of the consent code (layout and Footer import
  it only through `next/dynamic` loaders). With the flag on: no request,
  storage write or device-property read before a choice; Decline and
  Allow are equal buttons, Decline first; Esc hides the bar for the page load
  and stores nothing; Decline and withdrawal store `denied`, stop and abort
  the (WA-2b) tracker, then call `POST /api/v/forget` with a
  `fa_forget_pending` retry; `fa_consent` lasts 365 days fixed and a consent
  version bump asks again; other tabs follow a withdrawal; no bar or settings
  button on `/dashboard`. New CI step: consent bundle budget after the build.
  The privacy text (`legal.ts`) is unchanged until WA-6; GPC/DNT handling and
  the final copy follow in WA-5 (#157). No new dependency.

- **Device-service admin GUI, slice 1** (#45): ADMIN-only `/dashboard/devices`
  with the same gate, token handling and look as `/dashboard/auth`. Overview
  tiles (devices live, last message, active schedules, next run); one card per
  device with its last known state and age and switch on/off for light, night
  light and rain (`POST /devices/{id}/control`) — enabled only while the device
  reports, since commands are not stored by the broker; schedules list, create,
  edit, delete and activate/deactivate (`/schedules`) with cron presets in
  Zurich time (stored as UTC, the daylight-saving shift is shown) plus a raw
  field that rejects per-second expressions, device-service's validation
  messages under the field, and its `nextRun` shown after saving. Subnav tab
  and the IoT Platform tile's "Manage" link are live. New env
  `DEVICE_SERVICE_URL` (plain value, no new secret). Device registration and
  deletion follow in a later slice. No new dependency.

- **Site-wide SEO and GEO baseline** (#134): every public page builds its
  metadata with `buildPageMetadata` (`src/lib/seo/metadata.ts`): a
  self-referencing canonical, `de`/`en`/`x-default` alternates, OpenGraph
  (`de_CH`/`en_GB`) and Twitter tags. hreflang now comes only from the HTML
  and the sitemap: the next-intl middleware no longer sends a `Link` header
  (`alternateLinks: false`), whose `x-default` named the unprefixed URL and
  contradicted both. The sitemap's `<lastmod>` is each page's last significant
  change from `src/lib/seo/pages.ts` instead of the build time; the automation
  page's "Stand" date reads the same entry. JSON-LD: `WebSite`, `WebPage` and
  the owner's `Person` on the home page, a `ProfilePage` on `/about`, all
  sharing the ids `https://furchert.ch/#website` and
  `https://furchert.ch/#person`; the automation and homelab pages now point to
  the site with `isPartOf`. The homelab page's lastmod is the date the page
  shows (`LAB_CONTENT_UPDATED`). robots.txt adds `Content-Signal: search=yes,
  ai-input=yes, ai-train=no` (Cloudflare's managed block cannot set
  `ai-input`). New `/llms.txt`: a short Markdown summary with the key links,
  following the llmstxt.org proposal (an emerging convention, not a standard).
  Vitest inlines next-intl so tests run the real router. No new dependency.
- **Public homelab showcase and live status** on `/projects/homelab`: what runs
  in the homelab (public repos only) and the live status of six public services
  (up/down and 14-day availability) from the new unauthenticated
  `GET /api/homelab-status` (cached, allowlisted opaque ids, never an error
  text, `unknown` when Prometheus is unavailable). No new dependency, no
  manifest change.
- **Impressum and Datenschutz pages** (#16): `/[locale]/imprint` and
  `/[locale]/privacy` (DE + EN) replace the footer placeholders and are in the
  sitemap. The imprint names the owner and the e-mail address, which
  `ContactEmail` renders in the browser only (#147; no postal address, owner
  decision). The privacy notice is limited to what Swiss law requires
  (purposes, data categories, recipients with their countries, cookies) and
  promises nothing beyond what the system verifiably does: no retention
  periods, hosting-location, backup, Sentry or training statements. Its
  contact section names the contact form's fields and discloses that the
  owner may handle e-mails with Claude (Anthropic Ireland, Limited; possible
  US processing). Copy lives in `src/data/legal.ts`; `src/data/legal.test.ts`
  guards it (no e-mail in text, no postal address, no dashes, required
  recipients incl. Anthropic Ireland, removed topics stay out).

### Changed

- **Copy pass** (#160): new home hero, corrected project cards, German status
  labels, unified numbers; Aemtlifyer card removed.
- **Copy pass follow-ups** (#163): `/projects/aemtlifyer` redirects (308) to
  the projects list; the dashboard tile for Karaokee shows "Repo".
- **Spacing and grid pass** (#167): frame lines run unbroken through the
  automation hero, CTA strip and footer; the home hero fits the viewport below
  the header; buttons are 48 px high; the projects grid is 3+3 on wide screens
  with the GitHub link as its sixth cell; 16 px page gutters and 20 px card
  padding on phones; fractional rem spacing moved to the 4 px grid; the CTA
  strip has a filled primary button and a quiet GitHub text link.
- **Grid seams and contact on mobile** (#175): where a grid's last column met
  the vertical frame line, two hairlines sat side by side; the grid now
  reaches into the frame pixel and clips it (home, about, projects, homelab
  showcase, automation price steps), which also stops hover backgrounds from
  painting over the frame. Two horizontal double lines are gone (projects
  header, rowing photo). The contact page stacks below 640 px with equal
  20 px insets and one divider instead of uneven insets.
- **Type scale and uppercase on public pages** (#176): 11 type tokens (`--fs-12`
  to `--fs-hero`) in `globals.css` replace about 40 ad-hoc font sizes across
  the public pages, layout and shared components; nothing renders below a
  12 px floor any more. Uppercase now stays only on short structural labels
  (nav, buttons, section labels, table heads, status pills); sentences, meta
  lines, tech names and form labels use normal case, and tracking is never
  negative below 24 px. Dashboard tags (`Tag`, used on the network page) now
  show their raw lowercase values (block/allow, outcomes). The rowing photo
  caption got proper capitalisation, and the unused DM Sans weight 300 is no
  longer loaded. The dashboard and the consent bar follow in later steps.

### Fixed

- **Copilot data-boundary footnote and FAQ** (#165): /automation now names all
  three documented exceptions to the EU Data Boundary (Bing web search,
  Anthropic models if enabled, flex routing at peak load).

- **Web analytics dashboard follow-ups** (#156, review of #170): the coverage
  chart groups days into weeks or months for longer ranges like section 1
  (sampled and partial buckets marked); funnel comparisons skip steps that
  rest on a cell below 3; new and returning visit tiles show "< 3" at 1–2;
  every visitor-count basis (7 days, 28 days, month) gets its label.

- **Accessibility and tokens pass** (#151): small text on light surfaces is
  never lighter than `--n-60` (5.26:1; `--n-50`/`--n-40` labels were 3.47 and
  2.32:1), footer text on navy moves to `--n-40`. Status colours are split
  into dot tones (`--status-*`, 3:1) and text tones (`--status-*-ink`, 4.5:1),
  so project pills, dashboard status labels, pills, hints and flags are
  readable; status text hexes become ink tokens. Global
  `:focus-visible` ring (white on dark bands), visible input focus halo,
  buttons hover by a surface step instead of dimming, `tabular-nums` on
  figures, motion tokens, and the page entry animation honours
  `prefers-reduced-motion`. No layout or copy change.

### Security

- **Contact e-mail kept out of the server HTML and the RSC payload** (#147):
  Cloudflare's Email Obfuscation (#125) only rewrote the HTML; the RSC payload
  still carried the owner's address in plain text on every page. The footer,
  the home CTA strip, the contact page and the automation page's e-mail button
  now render it through the client component `ContactEmail`, which assembles
  it from reversed segments in the browser after hydration
  (`src/data/contact-email.ts`). Server HTML, no-JS visitors and the first
  client render get a neutral "E-Mail"/"E-mail" label (or the button label)
  as a link to the contact page; no "[at]" form, which harvesters decode.
  The contact form's server-error message gets the address interpolated in
  the browser. The `suppressHydrationWarning` workarounds on those elements
  are gone. `src/contactEmailGuard.test.ts` fails if the address appears in
  `src/` or `public/` or a non-client module imports the helpers; CI greps
  the build output (`.next/server`, `.next/static`) for it after
  `pnpm build`. No new dependency.
- **Security headers tightened** (#42): HSTS raised from 1 day to 1 year
  (`max-age=31536000`, still no `includeSubDomains`/`preload`); the CSP
  directives that do not depend on inline scripts or styles are now enforced
  (`frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action
  'self' https://auth.furchert.ch` — the IdP origin because sign-out POSTs a
  form that redirects there); `script-src`/`style-src` and the rest stay
  Report-Only pending the nonce/hash decision; `X-Powered-By` is no longer
  sent. `src/securityHeaders.test.ts` pins the values.
- **Sign-out without a session redirects to the public origin** (#42): the
  no-session branch of `/api/federated-logout` redirected to the internal
  request origin (`https://0.0.0.0:3000/` behind the tunnel); it now uses
  `AUTH_URL` like the other branches, which the enforced `form-action` also
  requires.
- **Node 22.23.1 → 22.23.4** (#100): Node's bundled root store moves to NSS
  3.131.1, which distrusts the emSign roots behind the compromised eMudhra
  intermediates (https://blog.cloudflare.com/emudhra-certificate-compromise);
  22.23.1 still accepted those chains. 22.23.4 is also a Node security release.
- **Pod hardening** (#78): the Deployment runs as non-root UID/GID 1001 with
  `seccompProfile: RuntimeDefault`, no privilege escalation, all capabilities
  dropped and a read-only root filesystem; `emptyDir`s for Next's route cache
  and `/tmp` are the only writable paths. Unknown locales and `/projects/[slug]`
  slugs now 404 without being rendered (`dynamicParams = false`), so made-up
  URLs can no longer fill the route cache.
- **`replicas: 1` documented as a hard constraint** (#83) while the
  contact-form rate limiter is in-process (DEPLOYMENT.md "Replicas").
- **Federated logout:** the route's header comment now states that the
  `id_token_hint` is visible in the redirect URL, and DEPLOYMENT.md documents
  the accepted exposure window: at most 30 min after sign-in, the fixed
  id_token lifetime (#79).
- **Unit tests for access-control logic** (#81): `asRole()`, the
  `/dashboard/network` search-param parsers (moved to `searchParams.ts`) and
  the logout CSRF check (`src/lib/auth/sameOrigin.ts`).

### Added

- **`/dashboard/services` — service utilization and availability** (#47):
  ADMIN-only page, new Services tab in the dev-area subnav. Per Deployment and
  StatefulSet in `apps` and `homeassistant` (exclude list in
  `src/data/service-health.ts`): CPU and MEM as a share of the highest
  container's limit (request as marked fallback), a 14-day availability strip
  (13 full Europe/Zurich days plus today) whose today bar expands a last-24-hours
  hourly strip, and 24 h / 14 d availability and restart totals. Live from
  Prometheus server-side (five queries; first `query_range` use, see
  `INTERFACES.md` §2); failed or empty query groups degrade to "—" / grey bars
  with a partial notice, never fabricated data. The 14-day window matches the
  Prometheus retention; a longer window is tracked in doemefu/homelab#247. No
  new dependency, env var or manifest change.
- **`/dashboard/auth` — auth-service admin GUI** (#44, Epic #43; contract
  `../auth-service/INTERFACES.md` §4/§8, ported from the prototype
  `auth-admin.jsx`): ADMIN-only page with Overview (live UP/DOWN, user and
  device-client counts, JWKS key), Users (list with search and status/role
  filters, create, edit username/email/role/status, delete, admin password
  reset), Device clients (list, register with the one-time secret shown once,
  revoke) and JWKS (public key set). Sessions & tokens and the audit log have
  no auth-service API and are labelled "not available". Calls run
  server-side with the admin's own access token; every mutation is a Server
  Action that re-checks the session and the ADMIN role. The user list needs
  doemefu/homelab-auth-service#115. The dev-area tab and the dashboard's
  "Manage" link for Auth Service are now live (Device Service stays
  disabled until #45). New optional env `AUTH_SERVICE_URL` (default: the
  cluster-internal auth-service; set in `k8s/deployment.yaml`).
- **First automated tests**: Vitest (`pnpm test`) for the auth-admin client,
  form validation, token refresh and the Server Actions' role gate; runs in
  CI (`ci.yml`, `build.yml`).
- **`/dashboard/network` — logins section** (NM-4, #64; contract
  `infrastructure/docs/060-network-monitoring.md` §7.2/§8 plus the
  doemefu/homelab#134 amendment): replaces the logins placeholder with data
  from data-service's `/api/netmon/logins/summary` and `/logins/events` for the
  page window: outcome tiles (successful, failed, locked, listed IPs and
  accounts), a stacked hourly/daily timeline (empty slots zero-filled), top
  source IPs by failed + locked attempts with country and reputation, accounts
  with failures on the same username hash, and a login-events table (outcome
  badge, IP and its source, country, account, username tag, user agent)
  filterable by outcome (`?lgOutcome=`) with pinned-window paging
  (`?lgCursor=`). Private or missing IPs are plain text, not `?ip=` links.
  Honest states: "not yet available" without the NM-4 API, "no login data
  yet" while the `login-events` collector has no source data, a configuration
  hint on a `credentials` failure, and per-block "unavailable" otherwise.
- **Collector status warnings**: a run that succeeded with a warning code
  (`upstream`, `truncated`, `partial` or an unknown code) now shows a warning
  badge in the status strip instead of looking plainly fresh.
- **`/dashboard/network` — egress section** (NM-2, #63; contract
  `infrastructure/docs/060-network-monitoring.md` §7.2/§8): replaces the
  egress placeholder with data from data-service's `/api/netmon/egress/top`
  (external destinations, top 50 flows) for the page window. Flows are grouped
  per workload (host processes labelled as such), ordered by traffic, with
  FQDN or IP:port, node, bytes sent/received (SI units), connects, failed
  connects, first seen and a "new" badge (not seen in the previous 30 days).
  Tiles (listed flows, new flows, bytes) and a top-workloads bar list summarise the listed flows; groups are keyed by namespace and workload. Public IPs
  (v4 and v6) link to the `?ip=` panel; private, CGNAT and ULA addresses do
  not. Honest states: "not yet available" when data-service has no egress
  API yet, "no egress data yet" while the `egress` collector has never
  succeeded, "no data in this window" plus an agent hint after a success,
  and a section "unavailable" / HTTP-error note otherwise.
- **`/dashboard/network` — LAN section** (NM-3, #62; contract
  `infrastructure/docs/060-network-monitoring.md` §7.2/§8): replaces the LAN
  placeholder with data from data-service's `/api/netmon/lan/connections`,
  `/lan/ufw-blocks` and `/lan/ssh-auth` for the page window. Connections are
  grouped per watched port (MQTT, SSH, Home Assistant, Kubernetes API,
  kubelet) by source, node and conntrack state; UFW blocks show the total,
  top sources/ports and a table, labelled as a lower bound; SSH shows
  accepted/failed/invalid-user totals and per-source rows with the
  "failed is a lower bound" caveat. Public and LAN IPs link to the `?ip=`
  panel; the pod CIDR and the `other` overflow bucket render as labels.
  Honest states: "not yet available" when data-service has no LAN API yet,
  "no LAN data yet" while the `lan` collector has never succeeded, and a
  per-block "unavailable" / HTTP-error note otherwise.
- **`/dashboard/network` — network monitoring, inbound section** (NM-1, #61;
  contract `infrastructure/docs/060-network-monitoring.md` §7/§8): a new
  ADMIN-only dashboard page with a "Network" subnav tab. Server-rendered from
  data-service's read API (`/api/netmon/status`, `/inbound/summary`,
  `/inbound/firewall-events`, `/ips/{ip}`) with a cached client-credentials
  token for the existing `furchert-ch` client (scope `netmon:read`, no new
  secret; `src/lib/netmon/{token,client}.ts`, `src/netmon.env.ts`, env
  `DATA_SERVICE_URL`/`DATA_SERVICE_TOKEN_URL`). Collector status strip,
  totals, inline-SVG timeline, top client IPs with `?ip=` detail, div-bar
  lists for countries/ASNs/hosts/paths/status codes, and a paged firewall
  events table; window `?window=24h|7d|30d`. No chart library, no client JS,
  no route handler. Each section fails independently to an honest
  "unavailable" / HTTP-error note; tokens and IPs are never logged. New
  shared `NoAccess` component for signed-in non-ADMIN users (to be reused by
  #44/#45); `SignInGate` gains an optional return path. LAN, egress and
  login sections are labelled placeholders until NM-3/NM-2/NM-4.
- **Contact form now delivers real mail** (#46): `submitContact()` sends the
  validated submission by authenticated SMTP to `info@furchert.ch` via
  Infomaniak (`mail.infomaniak.com:587`, `nodemailer` 10.0.9, plain text
  only), with the submitter as Reply-To. Adds a honeypot field, per-field
  size caps, and an in-process rate limiter (3/10min per client, 20/hour
  global) since the action is a public unauthenticated endpoint spending a
  real, quota-limited SMTP send per call. New `error: 'rate_limited'`
  result and matching UI copy. Only `{code, responseCode, command}` are
  logged on failure — never the submitter's name, email, or message body.
- **Live dashboard cluster/app metrics from Prometheus** (#17): `/dashboard`
  now fetches per-node CPU/MEM/ready-status and workload-availability from
  `kube-prometheus-stack-prometheus` server-side at request time
  (`src/lib/metrics/{prometheus,cluster}.ts`, new optional `metrics.env.ts`,
  `PROMETHEUS_URL`) — no new dependency, no new public API surface, the
  Prometheus URL never reaches the browser. Four instant queries run via
  `Promise.allSettled` with a 2.5 s timeout each; a single failed query
  degrades gracefully, an unreachable Prometheus or an empty result renders
  the known node hardware with honest "—" placeholders, `unknown` status
  dots, and a visible unavailable note instead of fabricating data. When any
  app tile's status is genuinely unknown (Prometheus down or the workloads
  query specifically failed), the apps kicker switches from the precise
  "x/9 online" count to an honest "status unavailable" line instead of
  claiming a fabricated count. New `--status-offline` / `--status-unknown`
  design tokens.

### Changed

- **Contact form with call back and attribution** (#145, part 2): `/contact`
  in the Sie form («Melden Sie sich», reply «spätestens am nächsten
  Arbeitstag») with a topic choice (live demo or something else), «Rückruf
  gewünscht» with a phone field (whenever it is ticked, the e-mail is optional
  and the phone required), an optional message and an optional «Wie sind Sie
  auf mich aufmerksam geworden?» select; name, e-mail and phone carry
  `autocomplete`. The call back starts unchecked; the new «Rückruf anfordern»
  link in the /automation hero and closing call to action
  (`?from=automation-callback`) pre-ticks it. The page stays static: the form
  reads `?from=<id>` after hydration, keeps only ids on `FROM_IDS`, removes
  the parameter from the address bar and sends it with the enquiry. Phone
  numbers need 9 to 15 digits (no-break spaces count as spaces); 090x and
  non-Swiss numbers are accepted and flagged in the mail. The mail sets
  Reply-To only with an e-mail, prefixes the subject with «Rückruf: » or
  «Live-Demo: », always adds «Anliegen:» (an unchosen topic counts as «Etwas
  anderes») and adds «Telefon:», «Rückruf gewünscht: ja», «Quelle:» and
  «Aufmerksam geworden:» lines only for checked values; names and e-mail
  addresses with control, bidi or invisible format characters are rejected, so
  no line above «Message:» can be forged. A phone error marks and focuses the
  field; the success text (demo or general, with the number for a call back)
  is announced and focused. A privacy note under the button says that the
  details arrive by e-mail together with the button that led to the form, and
  links to the privacy page `/privacy` (#128). No cookie, no storage, no new
  env var or dependency. Tests: `submitContact` cases, mailer lines and header
  safety, phone rules, the allowlists, the call-to-action ids in use and the
  unchecked call back.
- **`/automation` rebuilt for the Gate-0 offer, construction first** (#145,
  part 1): a light hero «Drei Dinge, die KI im Bau heute schon kann.» with three
  CSS-only example tiles (native `<details>`: a site report spoken into the
  phone, a quote draft from an enquiry, the 5:30 am overview as a later own
  automation), «So arbeite ich», a Regie example with a sample calculation,
  four steps with fixed prices (live demo free, assessment CHF 750, rollout
  CHF 3'900 under 20 people or from CHF 7'500, subscription CHF 200 a month or
  CHF 500 to 900) and the risk reversal, the own automation once as «Später
  möglich», «Ihre Daten», a short about section, ten FAQs and the closing call to
  action after the FAQ. A sticky call to action appears on phones once the
  hero has scrolled out. Every contact button links to `/contact?from=<id>`
  (new `src/data/contact-sources.ts`, `contactHref`/`FromId`); the closing
  section keeps a mailto link; the contact form changes followed in part 2 (#149).
  Labels and the new `Tag` `contrast` prop use `--n-60` instead of `--n-50` on
  /automation (AA contrast); new `mail` and `cloud` icons. The price FAQ is visible but left
  out of the FAQPage JSON-LD (`faqsForMarkup`): no CHF amount in structured
  data. The trade stories are gone. Home: «KI für KMU» first in the nav, hero
  and teaser name the construction focus, the bottom CTA strip addresses
  businesses (new optional `CTAStrip` props). `/automation/scan` is retired:
  `/automation/scan` and `/{de,en}/automation/scan` redirect (308) to the
  locale's `/automation`, and the vanity URLs `/ki` and `/bau` redirect (307)
  to `/de/automation`. The home ticker stops under reduced motion. `llms.txt`
  describes the new offer. Tests: copy guards rewritten (approved amounts,
  sample-calculation amounts, bans, tags, FAQ markup), redirects pinned, DE/EN
  key parity over the whole public tree and a used-keys check. No new
  dependency.
- **`/automation` made concrete, with prices** (#139): four invented trade
  stories (electrician, carpentry, bakery, hair salon) replace the six abstract
  use-case cards, each with estimated hours per week before and with AI, what
  the owner still decides, where the data goes and the fitting package. One
  labelled before/after example shows an electrician's voice memo and the report
  draft made from it. The process block became "Ablauf und Preise" with the
  owner-approved prices (initial consultation free, AI quick check CHF 600,
  first trial run from CHF 2'500 or from CHF 6'000 with a connection, AI care
  from CHF 190 a month, team workshop CHF 1'500, no VAT as not VAT-registered);
  the FAQ answers "Was kostet das?" with them and gains two entries. The
  FAQPage JSON-LD still mirrors the visible FAQ, so a price can now appear as
  answer text; Offer and price markup stay forbidden. The English page names
  Zurich instead of the Oberland. No em dashes in the automation and scan copy;
  the photo placeholder in the about box is gone. The hero shows a price line
  under the call to action, the about box no longer claims a finished degree
  in English, and `public/llms.txt` names the packages with their prices.
  `automationCopy.test.ts` now allows only the approved price phrases (page
  copy and llms.txt), and `seoCopy.test.ts` covers the `/automation` and scan
  copy as well. No new dependency.
- **No em dashes in the public copy; titles use "|"** (owner, 2026-11-03):
  visible text and page titles outside `/automation` (rewritten separately)
  and the private dashboard use a full stop, comma, colon or "·" instead of
  "—". Every title reads "X | Dominic Furchert" (the home page "Dominic
  Furchert | …"); titles built in code use `ownerTitle`
  (`src/lib/seo/metadata.ts`). The home hero drops the filler
  "wiederkehrende", and the about, rowing and home texts lose phrases that
  read like filler. English says "Zurich" ("around Zurich", "the Zurich area")
  and never names the Oberland; German keeps "Zürcher Oberland". Project names
  read "IoT Platform: Terra1" and "Karaokee (SoPra FS26)".
  `src/i18n/seoCopy.test.ts` rejects "—" in titles, descriptions, public
  messages and page data, and "Oberland" in English copy (the `/automation`
  copy joins with its rewrite), and `llmsTxt.test.ts` in llms.txt; page dates
  in `src/lib/seo/pages.ts` follow the changed pages, and the date test uses
  the Swiss calendar day.
- **Search-result copy and a clearer introduction** (#134): every public page
  has its own title and meta description in both languages (`metaTitle` /
  `metaDescription` in the messages); every title names Dominic Furchert and
  each description says what the page is about. The home hero now introduces
  him by name and leads with the AI offer for SMEs in the Zürcher Oberland;
  the about text and the 2026 timeline entry describe that offer instead of
  "Industrie-KMU". The site names one place for him, the Zürcher Oberland (EN
  "Zurich", see above), in the hero label, the footer and on `/contact`; the
  rowing club keeps its name. `src/i18n/seoCopy.test.ts` keeps titles at most
  60 and descriptions 70-160 characters, name-bearing and free of "ß".
- **Sign in again once after this release**: the session now also stores the
  OIDC access and refresh token (server-side, in the encrypted session
  cookie) for the admin GUI. Older sessions keep working everywhere else;
  `/dashboard/auth` asks for a fresh sign-in.
- **Base image digest-pinned and pulled via `mirror.gcr.io`** (#118): the
  `Dockerfile` uses `node:22.23.4-alpine@sha256:<index digest>` (Docker
  official image). Anonymous pulls from the shared GitHub runners failed
  Build-and-Push with `429 Too Many Requests`, first on Docker Hub
  (2026-10-09), then on the ECR Public mirror used in between (3 of the last
  10 `main` runs failed, most others needed re-runs). CI's BuildKit builder
  now pulls docker.io content through Google's Docker Hub mirror
  `mirror.gcr.io` with docker.io as fallback; Dependabot tracks the base
  image (`docker` ecosystem, majors ignored); PRs build and smoke-test the
  image (`ci.yml` job `image`).
- **ESLint 8.57.1 → 9.39.5, eslint-config-next 15.5.25 → 16.3.5** (#59):
  `.eslintrc.json` (`root: true`, `ignorePatterns`) is removed and replaced
  by a flat `eslint.config.mjs` (core-web-vitals + typescript presets;
  ignores `.next/`, `.claude/`, `out/`, `build/`, `next-env.d.ts`);
  `pnpm lint` is plain `eslint .`. Now enforced: the 14 React-Compiler rules
  of `eslint-plugin-react-hooks` 7,
  `@next/next/no-location-assign-relative-destination` and
  `@typescript-eslint/recommended`. The single intentional post-hydration
  effect in `DateTimeStrip.tsx` is exempted inline (follow-up #66).
- **Build and Push builds `linux/arm64` natively instead of under QEMU**
  (#48): `build.yml` now runs `verify` → a per-platform `build` matrix
  (`linux/amd64` on `ubuntu-24.04`, `linux/arm64` on `ubuntu-24.04-arm`)
  pushing by digest → a `merge` job that publishes the unchanged tag set
  (`main-<UTC ts>` + short sha) only after both legs succeed and asserts the
  manifest list contains both platforms. Removes the QEMU crash class behind
  the #41 hangs; a full run takes ~3.5 min instead of 8–14 min. Timeout
  guards recalibrated to 25/20 min (build job/step) and 10 min (merge);
  build cache scoped per platform. Both workflows pin `runs-on` to
  `ubuntu-24.04` (ahead of `ubuntu-latest` moving to Ubuntu 26) and use
  `pnpm/action-setup@v5` (Node 24 runtime; v4 ran on the deprecated Node 20).
- **Next.js 15.5.24 → 16.3.5** (#53, #58): completes the Dependabot bump that
  left `main` unbuildable. Because Next 16 removed `next lint`, `pnpm lint`
  ran the ESLint 8 CLI directly (`eslint . --ext .ts,.tsx,.js,.jsx,.mjs`)
  and `.eslintrc.json` gained `ignorePatterns` for `.next/`, `.claude/` and
  the generated `next-env.d.ts` — both superseded by the ESLint 9 flat
  config in #59 above. `src/middleware.ts` is
  renamed to `src/proxy.ts` (Next 16 file convention; same next-intl
  `createMiddleware(routing)` and matcher).
  `tsconfig.json` carries the changes `next build` now enforces
  (`jsx: react-jsx`, `.next/dev/types`). Production builds use Turbopack
  (Next 16 default). Ships alongside the #57 group bump already live:
  react/react-dom 19.3.0, next-intl 4.14.5, nodemailer 10.0.10.
  `eslint-config-next` was held at 15.5.25 until the ESLint 9 flat-config
  migration (#59) landed in the same release.
- **Club Assist tile is now workload-backed** (#17): was static `wip`, now
  reflects the live `open-webui` deployment status (it has been live at
  club.furchert.ch for a while).
- Fixed the dead IoT Platform tile URL (`iot.furchert.ch` →
  `device.furchert.ch`) and replaced the non-existent "ArgoCD" tile with the
  real Flux CD GitOps controller (#17).
- Demoted "Personal Agent" to a static repo link — no backing deployment
  (#17).
- The `dashboard.sampleData` badge is gone, superseded by the real telemetry
  above (#17).
- Document the code-review-bot situation (CONTRIBUTING.md).
- Mark `.eslintrc.json` as `root: true` so `pnpm lint` resolves the repo's own
  config instead of searching parent directories (needed for nested
  git-worktree checkouts; no behaviour change for normal checkouts).
  Superseded by the flat `eslint.config.mjs` in #59.

### Fixed

- **Admin drawers** (#140, follow-up of #138): the user and schedule drawers
  keep Tab inside while open (also when focus falls to the page after a save
  disables the button), and `/dashboard/auth` returns focus to the opener on
  close, like `/dashboard/devices` (also after a delete, falling back to the
  "new" button). A field error is now tied to its input (`aria-invalid` plus
  `aria-describedby`), so screen readers announce both together. A rejected
  save in the user drawer no longer snaps the role and status selects back to
  their first option on screen (submitted through `onSubmit`, as in the
  schedule drawer). The device-client form already kept what was typed (its
  fields are controlled text inputs), so it only gets the field-error
  attributes. The reset-password field still clears after a rejected reset, on
  purpose. No new dependency.

- **Hydration error #418 behind Cloudflare Email Obfuscation** (#125):
  Cloudflare rewrites the contact address in the SSR HTML until its decoder
  script runs, so React's hydration failed on every public page and re-rendered
  it on the client. The address elements (footer, CTA strip, contact page, plus
  the admin user list and the dashboard's signed-in name) now accept the
  rewrite via `suppressHydrationWarning` on leaf elements; markup and design
  are unchanged.
- **Contact form delivers again via iCloud SMTP** (#115, homelab#255): every
  submission bounced because Infomaniak is not in furchert.ch's SPF and has no
  aligned DKIM, so iCloud rejected it under DMARC `p=reject` (the form showed
  success, the bounce was asynchronous). The mailer now sends through
  `smtp.mail.me.com:587` as `CONTACT_FROM` (`info@furchert.ch`), authenticated
  with `SMTP_USER` (new Secret key `smtp-user`, the primary iCloud address) and
  an app-specific password. Apply homelab#255 and run playbook 59 before this
  manifest (DEPLOYMENT.md "rollout order").

- **Bound "Build and Push" CI runtime with `timeout-minutes` guards** (#41):
  root-caused the two known multi-hour hangs (2026-08-28 run 33155146183,
  ~4h06m; 2026-08-30 run 33333359400, ~6h00m — the latter ended only by
  GitHub's own 360-minute default job timeout) to an identical QEMU crash
  (`qemu: uncaught target signal 4 (Illegal instruction) - core dumped`)
  during `linux/arm64` emulation of `pnpm install`/`pnpm build` in the
  "Build and push multi-arch image" step. Added `timeout-minutes` to
  `.github/workflows/build.yml` and `ci.yml`'s `verify` job: `verify` job
  15 min (generous headroom over its ~1.1 min observed max — not a ratio to
  reuse for retuning it down), `build-and-push` job 45 min and "Build and
  push multi-arch image" step 40 min (~3.5x/~3.2x their ~9–13 min observed
  historical maximum) so normal builds are unaffected, while a recurrence
  now self-cancels within 45 min of the job starting instead of blocking
  every later `main` build behind `concurrency: cancel-in-progress: false`
  (left unchanged; flipping it was considered and rejected). `DEPLOYMENT.md`'s
  troubleshooting entry rewritten with the root-cause evidence and
  calibrated duration numbers, and now distinguishes bounded job runtime
  from unbounded GitHub runner-queue wait. Removing QEMU entirely (native
  ARM64 runner matrix + manifest merge) tracked as a follow-up in #48.

### Removed

- The `pnpm.overrides.postcss` pin (#34): `next` 16.3.5 now pins `postcss`
  8.5.23 itself, so the override is redundant; the resolved version is
  unchanged.
- Dropped two app tiles with no backing deployment: Aemtlifyer (repo
  archived) and Longhorn (UI not routed anywhere) (#17).

### Security

- **`brace-expansion` 1.1.18 → 1.1.21** (Dependabot alert #100): the
  transitive copy under `minimatch` 3.1.5 (ESLint tooling only, not in the
  runtime image) is refreshed in the lockfile within minimatch's existing `^1.1.7`
  range. Dependabot's own security update failed with
  `security_update_not_possible`.
- **Dashboard session lifetime aligned with the IdP's authorization retention**
  (#30): Auth.js session `maxAge` set to 7 days (was unset — the Auth.js
  default of 30 days), matching auth-service's `app.jwt.refresh-token-expiry`
  (604800000 ms) / the window after which its `TokenCleanupScheduler` purges
  the `oauth2_authorization` row an `id_token_hint` needs to resolve — the two
  values must be changed together. `updateAge` stays at the Auth.js default
  (sliding still applies for an active session — documented limitation, not
  fixed here). `/api/federated-logout` now skips the IdP round-trip entirely
  when the session JWT carries no `id_token` at all (it clears the local
  cookie and redirects to `/` instead of sending a request that
  `id_token_hint`-required `/connect/logout` would only answer with a generic
  `400 invalid_token` page); in that case auth-service's own browser session
  cannot be ended from this RP either way — same outcome as before this
  change, since a missing hint got a `400` there too, not a session end — so
  a later sign-in may SSO silently against the IdP until that session times
  out on its own. The chunk-aware cookie-clearing logic is now a shared
  `clearSessionCookies()` helper used by both logout paths — **this also
  fixes a pre-existing production bug**: the session-cookie deletion was
  missing the `secure` attribute on the `__Secure-`-prefixed cookie name;
  browsers require `Secure` on any `Set-Cookie` for a `__Secure-`-named
  cookie (RFC 6265bis §4.1.3 cookie-prefix rule), so without it the deletion
  was silently rejected and the user remained signed in after an apparently
  successful logout in production.
- **Hardening headers on every response** (#42, headers-only — the "first
  automated tests" half of the issue is unaddressed here and stays open):
  `next.config.mjs` now sets `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`,
  `Permissions-Policy: camera=(), microphone=(), geolocation=()`, and
  `Strict-Transport-Security` (starting at `max-age=86400` — a conservative
  1-day rollout since this domain never sent HSTS before; raise it once
  burn-in confirms reliable HTTPS access) via `headers()`, applied to every
  route including `/api/*` (`src/middleware.ts`'s matcher excludes `/api/*`,
  so headers had to live in `next.config.js`, not middleware). Also adds
  `Content-Security-Policy-Report-Only` (**deliberately not enforcing** — no
  local runtime or live browser to validate it against the OIDC redirect
  flow / dashboard SSR first) with a baseline matching what the app actually
  needs (`'unsafe-inline'` for both `script-src` — Next.js's own hydration
  runtime — and `style-src` — this codebase's extensive React inline
  `style={{...}}` usage; `img-src self+data:`; `connect-src self` for
  Auth.js's own same-origin session/sign-in fetches). Graduating to an
  enforcing CSP and raising the HSTS `max-age` are both explicit, disclosed
  follow-ups, not silently deferred.
- **Refresh transitive dependencies for 9 Dependabot alerts** (refs #31,
  `doemefu/homelab`#47): `postcss` 8.4.31 → 8.5.23 (alerts #89/#71/#69/#40 —
  pinned via a `pnpm.overrides` entry since `next` 15.x hard-pins `postcss` at
  `8.4.31`; the override was dropped again in #34 once `next` 16.3.5 pinned
  `postcss` 8.5.23 itself),
  `sharp` 0.34.5 → 0.35.4 (alert #54 — via `next` 15.5.21 → 15.5.24, which
  widens the `sharp` optional-dependency range), `js-yaml` 4.1.1 → 4.3.2
  (alerts #91/#68/#52), `brace-expansion` 1.1.14 → 1.1.18 / 5.0.9 (alert
  #70). `eslint-config-next` bumped to `15.5.24` in lockstep with `next`.
  `pnpm audit` clears from 13 advisories to 0.

### Added

- **Phase 7 — containerize + deploy pipeline** (#14): multi-stage `Dockerfile`
  (Next standalone, non-root, pinned `node:22.23.1-alpine`), `/api/health` probe
  route, `k8s/` Deployment + Service (`apps` ns, probes, Flux image-setter marker),
  and GitHub Actions — `ci` (lint/typecheck/build), `build` (multi-arch image →
  `ghcr.io/doemefu/furchert-ch`), `codeql`. Cluster wiring (Flux bundle + Cloudflare
  Tunnel apex route + `furchert-ch-secrets`) lives in the `homelab` infra repo
  (#38). See `DEPLOYMENT.md`.

### Security

- **Federated logout hardened to a CSRF-safe POST** (PR #15 review):
  `/api/federated-logout` is now `POST`-only with a same-origin guard
  (`Sec-Fetch-Site` / `Origin`); `SignOutButton` submits a form instead of a
  GET navigation — prevents forced logout via `<img>` / prefetch. The
  `post_logout_redirect_uri` derives from `AUTH_URL` (set it to the public
  origin in prod — see `DEPLOYMENT.md`), `OIDC_ISSUER` is trailing-slash
  normalised, and the `auth.env` Proxy guards non-string property access.

### Changed

- Upgrade React 18.3.1 → 19.2.7 (react, react-dom, @types/react 19.2.17,
  @types/react-dom 19.2.4); type-only fix in Icon.tsx for React 19 element
  typing (supersedes #26).
- Upgrade TypeScript 5.7.3 → 6.0.3; add ambient `*.css` module declaration
  required by TS 6 (supersedes #25).
- **Dashboard cluster/app status labelled "Sample data / Beispieldaten"**
  (`dashboard.sampleData`) — static demo values are no longer presented as live
  telemetry (PR #15 review). Live metrics tracked in #17.
- **Footer Impressum / Datenschutz** render as non-interactive placeholders
  (were `href="#"`); real pages tracked in #16. All external `_blank` links use
  `rel="noopener noreferrer"`; `rel` dropped on `mailto:` / `tel:`.

### Fixed / a11y

- PR #15 review hardening: FAQ answer region + scan question groups gain
  accessible names; decorative icons `aria-hidden`; burger button
  `aria-expanded` / `aria-controls`; ticker marquee `aria-hidden`; `x-default`
  hreflang on every public page + sitemap; contact action logs only
  `messageLength` (no name/email PII); `request.ts` uses the `isLocale` type
  guard; `generateMetadata` locale guards across all public pages; dead `home`
  nav branch removed.

### Added

- Phase-5 dashboard review round (PR #13). **Identity:** the dashboard
  header now shows the signed-in user's name (`session.user.name ?? email`),
  with a visually-hidden `dashboard.signedInAs` label for assistive tech;
  no role badge (the overview is identity-light by design). **A11y:**
  filter chips expose `aria-pressed`, the per-tile repo link uses a
  descriptive `aria-label` (`dashboard.apps.repoAria`), the active Dev-Area
  subnav tab carries `aria-current="page"`, and the cluster status dot is
  now data-driven (`node.status`) with an `aria-label`. **Refactors:**
  `StatusDot` now owns the canonical `STATUS_COLOR` map (`AppGrid` imports
  it, replacing its local copy — supersedes the CI6 note below); a shared
  `formatDashboardDateTime()` (new `dashboard/datetime.ts`) is used by both
  `DashboardShell` (Zurich-pinned SSR) and `DateTimeStrip` (browser TZ);
  `ClusterNode.status` tightened to `'Ready' | 'NotReady'`. No new
  dependencies; no contract changes.
- Dashboard follow-ups (closes #10 + #11) — defence-in-depth +
  Phase-5 polish bundle. **#10:** `dashboard/page.tsx` now calls
  `assertAuthEnv()` (from `src/auth.env.ts`) before `auth()` so a
  missing `OIDC_CLIENT_ID` / `OIDC_CLIENT_SECRET` / `AUTH_SECRET`
  surfaces as a Next.js 500 with the actionable
  `[auth] required env var X is missing or empty.` message instead of
  silently rendering the shell (Auth.js v5 returns a truthy-empty
  session when `AUTH_SECRET` is absent — observed during Phase-5
  smoke). **#11 CI3:** new `DateTimeStrip` client island re-formats
  the dashboard header date with the browser's local time zone after
  hydration; SSR initial paint stays Zurich-pinned for SEO / no-JS;
  `key={locale}` on the parent forces remount on DE↔EN switch.
  **#11 CI4:** `AppGrid` Manage tile (Auth Service / IoT Platform) and
  offline external tiles now render as `<button type="button" disabled>`
  with `pointerEvents: 'none'` instead of misleading `<a>`/`<span>` —
  consistent a11y-discoverable disabled affordance. **#11 CI5:** dropped
  the unused `dashboard.cluster.controlPlane` / `dashboard.cluster.worker`
  translation indirections (both DE+EN resolved to identical lowercase
  tokens); `DashboardShell` renders `{node.role}` directly. **#11 CI6:**
  new `--status-online` / `--status-wip` / `--status-repo` design tokens
  in `globals.css` (semantically separate from `--tier-*` despite
  sharing today's hex values); `AppGrid` `STATUS_COLOR` and `StatusDot`
  now reference them. No new dependencies; no Phase-4/5 contract
  changes.
- Phase 5: Dashboard shell — port of `PageDashboard` from the design bundle.
  New `Subnav` with Overview active and Auth/Device tabs visibly disabled
  (`<button disabled>` with "soon" suffix) until Phase 6 wires the admin
  GUIs. New `DashboardShell` (server) renders the header bar with a
  locale-aware date/time strip pinned to `Europe/Zurich`, the k3s cluster
  overview strip (4 nodes, CPU/MEM mini-bars), the apps-section header,
  and the infra-shortcuts row. New `AppGrid` client island carries the
  single piece of UI state (category filter) and the tile grid; the
  "Manage" affordance on `Auth Service` / `IoT Platform` tiles renders
  disabled until Phase 6. Additive `compact?: boolean` prop on
  `SignOutButton` for the header-bar size; default-large variant
  preserved. Dashboard i18n namespace expanded into nested
  `subnav.*` / `cluster.*` / `apps.*` / `shortcuts.*` keys (DE+EN),
  unused `placeholder` + `back` removed. No new dependencies; no
  Phase-4 auth contract changes.
- Phase 4: Real OIDC dashboard auth (Auth.js v5, `next-auth@5.0.0-beta.31`) against
  `auth.furchert.ch` — Authorization Code + PKCE, `role` claim exposed to the
  session (fail-closed to `USER`), `/[locale]/dashboard` gated by a server-side
  `auth()` check rendering a real sign-in gate (replacing the prototype's
  fake email/Cloudflare mock). Access/ID tokens stay server-side only; sign-out
  is a server route (`/api/federated-logout`) that ends the IdP session with
  `id_token_hint`. Header reflects live session via a client `SessionProvider`,
  keeping all public pages statically rendered. `.env.local.example` added;
  cross-repo `furchert-ch` client registration documented in DEPLOYMENT.md
  (user applies + provisions the secret via SOPS). Middleware left intl-only;
  edge gating revisited in Phase 6.
- Phase 3: `/automation` landing (real product, verbatim port of the
  prototype) and `/automation/scan` (clearly-labelled **visual mockup
  only**). Wizard split into a `WizardShell` state machine + 4 step
  components (Website, Questions, Contact, Report). Persistent
  "Demo / Mockup" banner on every step; `robots:{index:false,follow:true}`
  on the `/scan` page metadata; sitemap includes `/automation` but
  excludes `/scan`. Step-4 carries a "Beispiel-Report / Sample report"
  badge and explicitly omits the PDF-download CTA. Bilingual DE+EN via
  per-record locale maps in `src/data/{automation-faqs,scan}.ts`; demo
  report prose route-private in `_demo-report.ts`. New ETHON tokens
  `--tier-high/mid/long` for status accents. CLAUDE.md "Automation =
  mockup" non-negotiable enforced both at UI controls (no `pattern`
  validation, no email-report checkbox, no fake loading state, no PDF
  download) AND at copy level (every step's text accurately describes
  what the preview does — no fake promises). Verified by 5 grep gates
  returning 0 matches (no `fetch`, no `/api/scan`, no Claude SDK,
  no `'use server'`, no external `<Script>`/`<img>`).
- Phase 2: Public pages ported pixel-faithfully from the prototype — Home,
  About, IT, Rowing, Projects (+ `/projects/[slug]` detail), Contact. Fully
  bilingual DE/EN via per-record locale-map typed `src/data/*` modules and
  next-intl `pages.*` labels. SEO: per-route `generateMetadata` with
  `alternates.languages`, `app/robots.ts` (disallows `/dashboard` +
  locale-prefixed variants), and `app/sitemap.ts` (next-intl
  `getPathname` + alternates). Contact form posts to a real server action
  (`'use server'`) that validates and server-logs — no silent fake success;
  real delivery wired in Phase 7 (superseded: real SMTP delivery shipped
  later via #46, see [Unreleased]). One CSS hover rule replaces a would-be
  client component; only `ContactForm` is `'use client'`. `Btn` gained
  additive `type`/`disabled` props for real form submission.
- Phase 1: Next.js (App Router, TS) skeleton + ETHON design system — pinned deps
  (Next 14.2.23/React 18.3.1/next-intl 3.26.4), DM Sans/Mono fonts, design
  tokens (`globals.css`), UI primitives, layout chrome (Header/Footer/Ticker),
  DE/EN i18n routing (`/`→`/de`), typed prototype data. Builds + lints clean.
  Tweaks panel intentionally excluded (design-tool artifact, not a product feature).
- Phase 0: Claude Code working conventions — `CLAUDE.md`, `.claude/rules/` (8),
  `.claude/agents/` (7), `.claude/skills/start-task`, worklog template, memory
  seed, settings; top-level documentation stubs (OVERVIEW, INTERFACES, DEPLOYMENT,
  CONTRIBUTING, this file, `docs/INDEX.md`). No application code yet.
