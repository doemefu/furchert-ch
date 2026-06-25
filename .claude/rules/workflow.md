# Required Workflow for Every Milestone (MUST FOLLOW)

For every user request that results in a code change, follow this 6-phase workflow and document it in a single worklog Markdown file (see worklog conventions). For each step, invoke the relevant superpowers skill. Pivot back to an earlier phase if things don't work out.

Each milestone (see the implementation plan's phases) must end in a **buildable, shippable** state and must update `.claude/memory/MEMORY.md` so any later session can resume without lost context.

## Phase 1 — research
High-level goal: understand what we're doing, why, and find all relevant code.
- Identify open questions and assumptions; if something is unclear, go one step back or ask the user.
- Inspect the local codebase: search with `rg`, check `git log`, check existing patterns and the prototype source (design bundle).
- Invoke the superpowers brainstorming skill.
- If it is a big change, invoke the agent team as described in the Agent Team section of CLAUDE.md.

## Phase 2 — plan
Produce a concrete plan with alternatives and specific file changes.
- Use the Markdown plan structure from `.claude/worklog-template.md` (section 2. plan).
- Include: goal, all options considered (chosen + rejected with reasons), files to change, step-by-step edits, tests, validation commands, risks & mitigations.
- Invoke the superpowers writing-plans skill.

After writing the plan markdown, Claude MUST:
1. Display a summary of it
2. Present a **checklist for user approval**:
    - [ ] Goal is clear and achievable
    - [ ] All options are realistic
    - [ ] No missing dependencies or risks
    - [ ] Implementation steps are concrete
    - [ ] Tests/verification are defined
3. Wait for user input ("Approved, proceed to Phase 3" / "Revise [section]" / "Reject, start over")
4. Only proceed to Phase 3 after explicit approval

## Phase 3 — review
Review the plan for defects (secret exposure, missing handlers, version pinning, design fidelity, automation-must-stay-mock).
- **Invoke the `plan-reviewer` subagent** on the plan before proceeding to implement.
- Apply findings directly by updating the plan in the worklog.
- Output (a) the updated plan and (b) a concise findings table: what was found and what changed.
- Use context7 to check the latest Next.js / next-intl / Auth.js docs where relevant.
- **GitHub:** move the corresponding issue to **Planned** (see `github-project.md`).

## Phase 4 — implement
- **GitHub:** move the corresponding issue to **In implementation**.
- Invoke superpower skills subagent-driven-development and/or executing-plans.
- Recreate design pixel-faithfully from the prototype source.
- Use context7 to check the latest documentation if things are unclear.
- Run lint/build commands from the plan and capture results in the worklog.

## Phase 5 — check implementation
Reviews against plan, reports issues by severity. Critical issues block progress.
- **GitHub:** move the corresponding issue to **In review**.
- Invoke superpowers requesting-code-review Skill.

## Phase 6 — ship
- Run integration checks if possible (`pnpm build`, `docker build`, `kubectl --dry-run`, manual smoke after user applies secrets).
- **Invoke the `doc-auditor` subagent** to check whether OVERVIEW.md, INTERFACES.md, DEPLOYMENT.md, CONTRIBUTING.md, README.md, CHANGELOG.md need updates. Implement all required changes it identifies.
- Provide final summary: what changed, how verified, follow-ups.
- **Required: Insert a new block at the top of `.claude/memory/MEMORY.md`** — decision, worklog link, open items.
- **GitHub:** move the corresponding issue to **Done**.

If anything becomes unclear in any phase, go one step back or ask the user.
