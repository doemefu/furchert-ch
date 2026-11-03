---
paths:
  - "src/**/*.{ts,tsx,css}"
  - "src/i18n/messages/*.json"
  - "eslint.config.mjs"
  - "next.config.mjs"
---

# Code Style & Conventions

### TypeScript / React / Next.js
- App Router, TypeScript strict. Server Components by default; add `'use client'` only when interactivity requires it.
- Functional components, hooks. No class components.
- Co-locate component-only types; shared types in `src/types/`.
- Static content as typed modules in `src/data/`; user-facing strings via next-intl (`src/i18n/messages/{de,en}.json`) — no hardcoded UI copy in components.
- Keep the ETHON design tokens in `src/styles/globals.css` as the single source; reference CSS variables (`var(--blue-base)`, `var(--n-60)`, …). Do not introduce a UI kit or a second styling system.
- Recreate the prototype **pixel-faithfully** (spacing, fonts, borders, the `.border-x` grid). Match visual output; restructure internals only when it serves Next/RSC.
- Accessibility: real `<button>`/`<a>`, labelled inputs, focus states (already in globals.css).

### Design fidelity
- The exported prototype (`shared.jsx`, `pages.jsx`, `dashboard.jsx`, `auth-admin.jsx`, `device-admin.jsx`) is authoritative for layout/styling. The old `furchert-ch-website-spec.md` is **not** — it was superseded.

### Secrets
- Plaintext secrets in git: **forbidden**. No secret values in code, env files committed to git, tests, or k8s manifests (use `secretKeyRef`).
- Secrets are SOPS + age encrypted by the user, never by Claude; Claude never reads or edits `*.sops.*` files — name the file and key and hand it to the user.

### SEO / GEO
- Every public page builds `generateMetadata` with `buildPageMetadata` (`src/lib/seo/metadata.ts`): canonical, hreflang, OpenGraph and Twitter come from there, never by hand.
- A new public page also gets a path in `src/app/sitemap.ts` and a date in `src/lib/seo/pages.ts`. Bump a page's date when its main content, its structured data or the links in its content change; header/footer changes do not count.
- JSON-LD (`src/lib/seo/jsonLd.ts`) states only what the page shows and never e-mail, phone, address or prices; reuse the `WEBSITE_ID` / `PERSON_ID` ids.

### Automation = mockup
- `/automation` and `/automation/scan` must remain non-functional visual mockups: no Claude API, no `/api/scan/*`, no persistence. Mark clearly in UI and code comments.
