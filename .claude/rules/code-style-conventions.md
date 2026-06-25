# Code Style & Conventions

### TypeScript / React / Next.js
- App Router, TypeScript strict. Server Components by default; add `'use client'` only when interactivity requires it.
- Functional components, hooks. No class components.
- Co-locate component-only types; shared types in `src/types/`.
- Static content as typed modules in `src/data/`; user-facing strings via next-intl (`src/i18n/de.json` / `en.json`) — no hardcoded UI copy in components.
- Keep the ETHON design tokens in `src/styles/globals.css` as the single source; reference CSS variables (`var(--blue-base)`, `var(--n-60)`, …). Do not introduce a UI kit or a second styling system.
- Recreate the prototype **pixel-faithfully** (spacing, fonts, borders, the `.border-x` grid). Match visual output; restructure internals only when it serves Next/RSC.
- Accessibility: real `<button>`/`<a>`, labelled inputs, focus states (already in globals.css).

### Design fidelity
- The exported prototype (`shared.jsx`, `pages.jsx`, `dashboard.jsx`, `auth-admin.jsx`, `device-admin.jsx`) is authoritative for layout/styling. The old `furchert-ch-website-spec.md` is **not** — it was superseded.

### Secrets
- Plaintext secrets in git: **forbidden**. No secret values in code, env files committed to git, tests, or k8s manifests (use `secretKeyRef`).
- Secrets are provisioned by the user (SOPS/age, outside this repo). We never edit `.sops.*`/age files.

### Automation = mockup
- `/automation` and `/automation/scan` must remain non-functional visual mockups: no Claude API, no `/api/scan/*`, no persistence. Mark clearly in UI and code comments.
