# Changelog — homelab-furchert-ch

All notable changes per milestone. Newest first.

## [Unreleased]

### Added
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
