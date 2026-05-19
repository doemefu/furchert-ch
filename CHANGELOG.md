# Changelog — homelab-furchert-ch

All notable changes per milestone. Newest first.

## [Unreleased]

### Added
- Phase 1: Next.js (App Router, TS) skeleton + ETHON design system — pinned deps
  (Next 14.2.23/React 18.3.1/next-intl 3.26.4), DM Sans/Mono fonts, design
  tokens (`globals.css`), UI primitives, layout chrome (Header/Footer/Ticker),
  DE/EN i18n routing (`/`→`/de`), typed prototype data. Builds + lints clean.
  Tweaks panel intentionally excluded (design-tool artifact, not a product feature).
- Phase 0: Claude Code working conventions — `CLAUDE.md`, `.claude/rules/` (8),
  `.claude/agents/` (7), `.claude/skills/start-task`, worklog template, memory
  seed, settings; top-level documentation stubs (OVERVIEW, INTERFACES, DEPLOYMENT,
  CONTRIBUTING, this file, `docs/INDEX.md`). No application code yet.
