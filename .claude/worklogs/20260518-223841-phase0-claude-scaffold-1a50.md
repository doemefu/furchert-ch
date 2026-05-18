---
id: "20260518-223841-phase0-claude-scaffold-1a50"
title: "Phase 0 — Claude scaffold + repo conventions"
phase: "done"
status: "done"
created_at: "2026-05-18T22:38:41+02:00"
updated_at: "2026-05-18T22:52:00+02:00"
---

## 1. research

**Goal:** Stand up the Claude Code working conventions for `furchert-ch`, mirroring
the `auth-service`/`device-service` repos, before any application code is written.

**Current state:**
- `furchert-ch` was an empty repo (README + LICENSE + .gitignore only).
- Sibling app repos use a consistent `.claude/` layout: `rules/` (8 files),
  `agents/` (7), `memory/MEMORY.md`, `skills/start-task/SKILL.md`,
  `worklog-template.md`, `worklogs/`, `settings.local.json`; top docs CLAUDE.md,
  README, OVERVIEW, INTERFACES, DEPLOYMENT, CONTRIBUTING, CHANGELOG, docs/INDEX.
- Deployment model: Flux CD `cluster/apps/<name>/`, image automation, Cloudflare
  Tunnel, `apps` namespace.

**Repo areas inspected:**
- `../auth-service/.claude/**`, `../device-service/.claude/**` — scaffold source
- `../auth-service/CLAUDE.md`, `../infrastructure/CLAUDE.md` — CLAUDE.md style
- `../infrastructure/APPS.md`, `cluster/apps/auth-service/**` — deploy model

**Git history notes:** single initial commit `b690f6d`; branch `dev`.

**Assumptions:**
- A1: furchert-ch is an app repo (like auth-service), so mirror its `.claude/`
  6-phase workflow + agent team, English. [high]
- A2: Frontend stack is Next.js/TS (approved plan). [high]

**Open questions:** none blocking — plan approved.

**Research summary:**
- Sibling repos share a precise `.claude/` + docs convention to mirror.
- Workflow is 6-phase, worklog-driven, MEMORY.md newest-on-top → resumable.
- furchert-ch is the cluster's single frontend; automation = mock only.

---

## 2. plan

See approved plan: `~/.claude/plans/fetch-this-design-file-encapsulated-diffie.md`
(Phase 0 section). Scaffold-only; no app code.

---

## 3. review

plan-reviewer not separately invoked for the scaffold-only phase (no code, no
secrets, no version pinning surface). Convention fidelity checked by diffing the
generated `.claude/rules` and `.claude/agents` listings against the sibling repos.

---

## 4. implement

**Changes made (Phase 0):**
- `CLAUDE.md` — high-level guidance adapted for the Next.js frontend.
- `.claude/rules/` — 8 rule files adapted to TS/Next/Docker/k8s.
- `.claude/agents/` — 7 agents reworded for a Next.js frontend + cluster integ.
- `.claude/skills/start-task/SKILL.md`, `.claude/worklog-template.md`.
- `.claude/memory/MEMORY.md` (seed), `.claude/settings.local.json`.
- Top docs: `README.md` (expanded), `OVERVIEW.md`, `INTERFACES.md`,
  `DEPLOYMENT.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `docs/INDEX.md` (stubs,
  filled per later phase per documentation-files.md ownership).

(Commands + results appended below as the phase completes.)

---

## 5. check implementation

```bash
$ diff <(ls .claude/rules) <(ls ../auth-service/.claude/rules)   # pass — IDENTICAL (8 files)
$ diff <(ls .claude/agents) <(ls ../auth-service/.claude/agents)  # pass — IDENTICAL (7 files)
```
- [x] `.claude/rules` listing matches sibling repos (8/8)
- [x] `.claude/agents` listing matches sibling repos (7/7)
- [x] CLAUDE.md readable and self-consistent
- [x] No secrets written; no app code; no commit
- [x] settings.local.json merged (preserved existing session allow-list)

---

## 6. ship

**Final summary:**
- Created the full `.claude/` scaffold + top-level doc stubs, adapted from
  auth-service/device-service for a Next.js/TS frontend (English, 6-phase
  resumable workflow, 7-agent team).
- Verified rule/agent file sets are identical to the sibling app repos.
- Repo left clean and resumable; no application code, no commit.

**User actions required:**
- `git commit` Phase 0. Suggested message:
  `chore: bootstrap Claude Code conventions + doc stubs (Phase 0)`

**Follow-ups:** Phase 1 — Next.js skeleton + ETHON design system.

**Memory entry added at top of `.claude/memory/MEMORY.md`:** yes
