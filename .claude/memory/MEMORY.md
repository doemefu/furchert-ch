# Memory — homelab-furchert-ch

<!-- Newest entry at the top. Each block: date, decision/status, worklog link, open items. Never put memory content anywhere but here / linked files. -->

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
