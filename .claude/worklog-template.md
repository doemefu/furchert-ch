---
id: "YYYYMMDD-HHMMSS-<slug>-<rand4>"
title: "<short human title>"
phase: "research"
status: "in_progress"
created_at: "YYYY-MM-DDTHH:MM:SS+02:00"
updated_at: "YYYY-MM-DDTHH:MM:SS+02:00"
---

<!--
  WORKLOG RULES
  - This file is append-only. Do not rewrite earlier phase notes.
  - Update `phase` and `updated_at` after each major step.
  - Set `phase: done` and `status: done` only after Phase 6 is complete.
  - Record every command and outcome (pass/fail + key output).
  - Keep all notes in English.
  - This log must explain decisions and findings so future changes avoid repeated mistakes.
  - Remove all HTML comments before finalizing the worklog.
-->

## 1. research

**Goal:** <!-- one sentence -->

**Current state:**
- <!-- relevant files and behavior -->

**Repo areas inspected:**
- `<!-- path -->` - <!-- observation -->

**Git history notes:**
- <!-- relevant commit or "none relevant" -->

**Assumptions:**
- A1: <!-- assumption --> [high/medium/low]

**Open questions:**
- Q1: <!-- question --> [blocker/non-blocker]

**Research summary (required, 3 bullets):**
- <!-- fact 1 -->
- <!-- fact 2 -->
- <!-- fact 3 -->

---

## 2. plan

**Goal:** <!-- one sentence: what must be true when done -->

### Context
**Summary:** <!-- 2-4 sentences -->

**Assumptions:**

| ID | Assumption | Confidence | Implication if wrong |
|----|------------|------------|----------------------|
| A1 | <!-- ... --> | high/medium/low | <!-- ... --> |

**Open questions:**

| ID | Question | Severity |
|----|----------|----------|
| Q1 | <!-- ... --> | blocker/non-blocker |

### Options considered

**Option 1 - [name] (chosen)**
- What:
- Pros:
- Cons:

**Option 2 - [name] (rejected)**
- What:
- Pros:
- Rejected because:

### Changes

**C1 - [short label]**
Files: `<!-- path -->`
- <!-- concrete step -->

### Tests

```bash
pnpm lint
pnpm typecheck
pnpm build
# pnpm test -- <pattern>   # if tests exist for the touched area
```

### Validation (proves goal is met)

```bash
# example:
# pnpm build && pnpm start  &  curl -sS http://localhost:3000/<route>
# kubectl apply --dry-run=client -k k8s/
```

### Risks

| ID | Risk | Likelihood | Impact | Mitigation |
|----|------|------------|--------|------------|
| R1 | <!-- ... --> | low/med/high | low/med/high | <!-- ... --> |

### Ship notes
- Docs to verify: `README.md`, `OVERVIEW.md`, `INTERFACES.md`, `DEPLOYMENT.md`, `CONTRIBUTING.md`, `CHANGELOG.md`
- User actions required: <!-- none or list (e.g. provision secret) -->
- Follow-ups: <!-- none or list -->

**Plan summary (required, 3 bullets):**
- <!-- scope -->
- <!-- verification strategy -->
- <!-- main risk -->

---

## 3. review

**plan-reviewer invoked:** yes / no

**Findings:**

| ID | Severity | Finding | Action taken |
|----|----------|---------|--------------|
| F1 | blocker/warning/info | <!-- ... --> | <!-- plan update --> |

**Plan updates applied in section 2:**
- <!-- list updates or "none" -->

**Review summary (required, 3 bullets):**
- <!-- key blocker/warning -->
- <!-- key plan fix -->
- <!-- readiness statement -->

---

## 4. implement

**Changes made:**
- C1: `<!-- file -->` - <!-- what changed -->

**Commands and results:**

```bash
$ <command>
# pass/fail + key output
```

**Implementation summary (required, 3 bullets):**
- <!-- implemented scope -->
- <!-- build/test status -->
- <!-- unresolved item or "none" -->

---

## 5. check implementation

**requesting-code-review invoked:** yes / no

**Verification against plan:**
- [ ] Planned changes completed
- [ ] `pnpm lint` / `pnpm build` pass
- [ ] Validation command successful
- [ ] No secret exposure/logging risks
- [ ] Automation still a mockup (if touched)
- [ ] Pixel fidelity vs. prototype (if UI)
- [ ] No unrelated refactors

**Findings:**

| ID | Severity | Finding | Resolution |
|----|----------|---------|------------|
| CI1 | critical/high/medium/low | <!-- ... --> | <!-- ... --> |

**Lessons learned (required):**
- <!-- what happened --> -> Prevent next time by: <!-- guardrail -->

**Check summary (required, 3 bullets):**
- <!-- quality status -->
- <!-- remaining risk -->
- <!-- ship gate decision -->

---

## 6. ship

**doc-auditor invoked:** yes / no

**Final verification:**
- [ ] Validation command passed
- [ ] Integration checks completed (or marked not applicable)
- [ ] Documentation updates completed

**Docs updated (per doc-auditor):**
- [ ] `README.md` - <!-- section or "not affected" -->
- [ ] `OVERVIEW.md` - <!-- section or "not affected" -->
- [ ] `INTERFACES.md` - <!-- section or "not affected" -->
- [ ] `DEPLOYMENT.md` - <!-- section or "not affected" -->
- [ ] `CONTRIBUTING.md` - <!-- section or "not affected" -->
- [ ] `CHANGELOG.md` - <!-- entry or "not affected" -->

**Decision log (required):**

| ID | Decision | Rationale | Impact |
|----|----------|-----------|--------|
| D1 | <!-- ... --> | <!-- ... --> | <!-- ... --> |

**Final summary (required, 3 bullets):**
- <!-- what changed -->
- <!-- how verified -->
- <!-- follow-up -->

**User actions required:**
- <!-- none or list -->

**Memory entry added at top of `.claude/memory/MEMORY.md`:** yes / no
