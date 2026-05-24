# Changelog — homelab-furchert-ch

All notable changes per milestone. Newest first.

## [Unreleased]

### Added
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
