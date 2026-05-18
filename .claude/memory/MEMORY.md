# Memory — homelab-furchert-ch

<!-- Newest entry at the top. Each block: date, decision/status, worklog link, open items. Never put memory content anywhere but here / linked files. -->

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
