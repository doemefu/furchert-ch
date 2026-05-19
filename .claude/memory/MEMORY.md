# Memory — homelab-furchert-ch

<!-- Newest entry at the top. Each block: date, decision/status, worklog link, open items. Never put memory content anywhere but here / linked files. -->

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
