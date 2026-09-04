# Changelog — homelab-furchert-ch

All notable changes per milestone. Newest first.

## [Unreleased]

### Added

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
- Document the Build-and-Push hang recovery and the code-review-bot situation
  (DEPLOYMENT.md, CONTRIBUTING.md).

### Removed

- Dropped two app tiles with no backing deployment: Aemtlifyer (repo
  archived) and Longhorn (UI not routed anywhere) (#17).

### Security

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
  `8.4.31`; remove the override once `next` moves its own pin to ≥ 8.5.23),
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
  real delivery wired in Phase 7. One CSS hover rule replaces a would-be
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
