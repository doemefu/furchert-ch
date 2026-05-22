# Memory — homelab-furchert-ch

<!-- Newest entry at the top. Each block: date, decision/status, worklog link, open items. Never put memory content anywhere but here / linked files. -->

## 2026-05-22 — Phase 4: Real OIDC dashboard auth (Auth.js v5 → auth.furchert.ch)

**Branch:** `auth-dashboard` (from `dev`). **Phase 3 (automation) is NOT on this
branch** — it lives on its own branch; independent (different routes), merges
cleanly. README/CHANGELOG/OVERVIEW here reflect Phase 0/1/2/4 only.

**Decision:** Wired real OIDC with **Auth.js v5** (`next-auth@5.0.0-beta.31`,
pinned exact). `/[locale]/dashboard` is gated by a **server-side `auth()` check
in the RSC** (page-level gate = authoritative; D-A), rendering a real sign-in
gate (replacing the prototype's fake email/Cloudflare mock) or a minimal authed
placeholder (name + role + sign-out). Real overview shell = Phase 5.
**Worklog:** `.claude/worklogs/20260522-103903-phase4-oidc-auth-f002.md`
**Status:** done — `pnpm lint`/`typecheck`/`build` pass; public pages stay SSG;
unauth `/dashboard` renders the real gate; providers + callback URL correct;
federated logout 307s to `/connect/logout`. **Pending commit by user** +
cross-repo client registration + secret.
**Key context for future sessions:**
- **`next-auth@5.0.0-beta.31`** pinned exact (no range). v5 env names:
  **`AUTH_SECRET`** (not `NEXTAUTH_SECRET`), `AUTH_URL` (not `NEXTAUTH_URL`).
- **Config split:** `src/auth.config.ts` (edge-safe, provider + callbacks) →
  `src/auth.ts` (`NextAuth(authConfig)` → `handlers/auth/signIn/signOut`) →
  `src/app/api/auth/[...nextauth]/route.ts`. Custom inline OIDC provider reads
  `process.env.OIDC_CLIENT_ID/SECRET` **explicitly** (v5 auto-env is built-in
  providers only). **Do NOT hardcode `checks`** — PKCE/nonce derived from
  discovery (SAS advertises it).
- **Token confinement (D-C):** access/id tokens live ONLY on the server JWT;
  the browser `session` exposes `role` only. Verified: no `idToken`/`accessToken`
  in `.next/static`. **Phase 4 persists only `id_token`** (for logout);
  `access_token` is intentionally deferred to Phase 6 (avoids cookie chunking).
- **Federated sign-out** = server route `src/app/api/federated-logout/route.ts`
  (`getToken` → `/connect/logout?id_token_hint=…&post_logout_redirect_uri=origin`,
  clears session cookie incl. chunked `.0…` variants). `SignOutButton` just
  navigates there. Keeps id_token off the client.
- **SSG preserved (D-B):** never call `auth()` in `[locale]/layout.tsx`. Header
  auth state via client `<SessionProvider>`+`useSession()` (`src/components/
  Providers.tsx` wraps the layout subtree). Only `/dashboard` is dynamic
  (`force-dynamic`). Note: Next labels it `●` (because parent
  `generateStaticParams`) but it is NOT prerendered (no `*dashboard*.html`) →
  functionally dynamic.
- **Role is fail-closed:** `profile()` maps `role === 'ADMIN' ? 'ADMIN' : 'USER'`
  (explicit equality, not a cast). Phase-6 admin gating MUST check
  `role === 'ADMIN'` server-side in every route handler (middleware is NOT
  authorization — middleware left intl-only this phase, F-Q2).
- **Cross-repo (user action):** register `furchert-ch` client in
  `../auth-service` — see `DEPLOYMENT.md` for the ready-to-apply
  `application.yaml` + `deployment.yaml` diff and the **JDBC `psql` seed** note
  (YAML is bootstrap-only; StaticClientSeeder skips existing clients on a running
  instance). Secret via SOPS. We never touch secret/age/.sops files.
**Open:**
- User must: register the client (+`psql` seed) in `../auth-service`, provision
  `furchert-ch-client-secret` via SOPS, create `.env.local` (`AUTH_SECRET` +
  `OIDC_CLIENT_SECRET`), then `git commit` Phase 4. Full login round-trip is only
  testable after that.
- **Pre-existing:** `next@14.2.23` has a known security advisory (flagged at
  install) — a Next bump is out of scope here and needs user approval (separate).
- Next: Phase 5 — dashboard overview shell (cluster nodes, app tiles from
  `dashboard.jsx`); then Phase 6 admin GUIs (reintroduce `access_token` + role
  gating + chunk-aware logout).

## 2026-05-20 — Phase 2: Public pages (Home, About, IT, Rowing, Projects + detail, Contact)

**Decision:** Ported the 7 public routes pixel-faithfully from
`pages.jsx` into the App Router. Fully bilingual DE+EN (user explicit
choice) via **per-record locale-map** typed `src/data/*` modules — DE/EN
length-drift structurally impossible, invariant fields (icons/tags/slug/
github/status/`year`/`value`) shared once. Short structural labels in
next-intl `pages.*`. RSC-default; only `ContactForm` is `'use client'`,
and the prototype's `onMouseEnter` bg hover became a CSS `.hover-card`
rule on server-rendered `<Link>` (no client component, no JS hover
flicker). Contact form posts to a real `'use server'` action that
validates + server-logs + returns `{ok:true|false}`; success only on
real ok response (CLAUDE.md "no silent fake success"). Per-route
`generateMetadata` with hreflang alternates; `app/robots.ts` + locale-
aware `app/sitemap.ts` via next-intl `getPathname`.
**Worklog:** `.claude/worklogs/20260519-085214-phase2-public-pages-38b9.md`
**Status:** done — `pnpm typecheck`/`lint`/`build` all pass; every
`/de`+`/en` route SSGs (incl. 12 project-detail paths); curl matrix 200
for all; `robots.txt` disallows locale-prefixed `/dashboard`;
`sitemap.xml` emits `<xhtml:link hreflang>` alternates. **Pending commit
by user.**
**Key context for future sessions:**
- **next-intl 3.26.4 does NOT export `hasLocale`** (added later). Use
  the local `isLocale` type guard exported from `@/i18n/routing`. It
  narrows `locale: string` → `Locale`. Don't try to import `hasLocale`
  from `'next-intl'`.
- **Btn primitive** gained additive `type?: 'button'|'submit'` and
  `disabled` props (default `type='button'`). Needed because the
  prototype relied on a button's default in-form submit; the Phase-1
  port hardcoded `type="button"`. Existing call sites unaffected.
- **F2 fix:** the layout `<main>` provides `paddingTop:var(--header-h)`.
  The home hero must NOT also set it (prototype did; 2× pad otherwise).
- **Bilingual content shape** = per-record `{...invariant, i18n:
  Record<Locale, …prose>}[]` — NOT `Record<Locale, T[]>`. Apply this
  shape to any new bilingual structured data in `src/data/*`.
- **Contact action** logs only `{name, email, messageLength}` (NEVER
  the body); `TODO(phase7)` marks where real delivery wires in.
- **`PROJECTS.summary`/`detail`** are now `Record<Locale, string>` —
  read as `p.i18n[locale].summary`. No consumers outside `projects.ts`
  today (verified via `rg`); other phases reading projects must update.
- A code-reviewer "fidelity" claim was wrong about the projects-list
  flex layout — the prototype `pages.jsx:417` DOES use
  `display:'flex'/flexDirection:'column'/gap:'1rem'` and the tag row
  uses `marginTop:'auto'`. Always grep the prototype before applying
  reviewer fidelity fixes.
**Open:**
- User must `git commit` Phase 2. Suggested message:
  `feat: public pages — bilingual DE/EN port (Phase 2)`
- Next: Phase 3 (master plan) — `/automation` + `/automation/scan`
  as a clearly-labelled visual mockup only (no backend, no Claude API).
- Phase 7 follow-ups: wire real contact delivery, revisit PII logging
  scope, optional `rel="noopener noreferrer"` sweep, optional
  `@media (hover: hover)` gate on `.hover-card`.

## 2026-05-19 — Phase 1: Next.js skeleton + ETHON design system

**Decision:** Built the buildable Next.js App Router skeleton: ETHON design
tokens (globals.css verbatim), DM Sans/Mono via next/font, UI primitives
(Icon/Tag/Btn/StatusDot/PageHeader/CTAStrip/ExpCard), layout chrome
(Header/Footer/Ticker), next-intl DE/EN routing (`/`→`/de`), typed `src/data/*`,
and a Phase-1 home placeholder.
**Worklog:** `.claude/worklogs/20260518-224948-phase1-nextjs-ethon-15e9.md`
**Status:** done — `pnpm build`/`lint`/`typecheck` all pass; `/de`+`/en` SSG.
Pending commit by user.
**Key context for future sessions:**
- **Toolchain:** Node v22.22.3 via **brew-nvm**, pnpm 9.15.4 (corepack). nvm is
  NOT on the non-interactive PATH — prefix every Node/pnpm Bash call with:
  `export NVM_DIR="$HOME/.nvm"; \. /opt/homebrew/opt/nvm/nvm.sh`.
- **Pins:** Next 14.2.23 + React 18.3.1 + next-intl 3.26.4 (exact, no ranges).
- **TweaksPanel deliberately NOT ported** — it is a Claude-Design host-protocol
  artifact (postMessage/EDITMODE), not a product feature. Language = real
  route-based DE/EN header toggle; ticker shown by default; accent = blue.
- i18n content lives in `src/i18n/messages/{de,en}.json`; prototype static data
  in `src/data/*` (German strings kept verbatim as in prototype).
- Home page is a placeholder — Phase 2 replaces it with the real PageHome.
**Open:**
- User must `git commit` Phase 1.
- Next: Phase 2 — port public pages (Home, About, IT, Rowing, Projects+detail,
  Contact) into `src/app/[locale]/` pixel-faithfully from `pages.jsx`.

## 2026-05-18 — Phase 0: Claude scaffold + repo conventions

**Decision:** Bootstrapped the `.claude/` working conventions for `furchert-ch`,
mirroring `auth-service`/`device-service` (English, 6-phase resumable workflow,
agent team) and adapting all rules/agents for a Next.js/TypeScript frontend.
Created CLAUDE.md and top-level doc stubs.
**Worklog:** `.claude/worklogs/20260518-223841-phase0-claude-scaffold-1a50.md`
**Plan:** `~/.claude/plans/fetch-this-design-file-encapsulated-diffie.md`
**Status:** done — scaffold only, no app code, no commit (user commits)
**Key context for future sessions:**
- Stack decided: **Next.js App Router + TS**, pnpm, next-intl (de default/en),
  Auth.js OIDC against `auth.furchert.ch`.
- `/automation` (+ `/automation/scan`) = **visual mockup only**, no backend.
- Admin GUIs (auth-admin, device-admin) live **in this repo**, wired to the real
  auth-service/device-service REST APIs — one frontend for the whole cluster.
- **Design source of truth = the exported prototype**, NOT
  `furchert-ch-website-spec.md` (that suggested antd and was superseded).
- Cross-repo work (later phases): register `furchert-ch` OIDC client in
  `../auth-service/application.yaml` + deployment env; add
  `../infrastructure/cluster/apps/furchert-ch/` Flux set + Cloudflare Tunnel.
  Secrets are user-provisioned via SOPS — we never touch secret/age/.sops files.
**Open:**
- Phases 1–7 not started. Next: Phase 1 (Next.js skeleton + ETHON design system).
- User must `git commit` Phase 0 (workflow rule: never auto-commit).
