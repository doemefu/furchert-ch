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
- Build on the prototype and the ETHON system (tokens, `--fs-*` type scale, the `.border-x` frame, `.cell-grid` seams, the square status LED). Fix craft defects without asking; propose bigger direction changes first.
- Accessibility: real `<button>`/`<a>`, labelled inputs, focus states (already in globals.css).

### Design fidelity
- The exported prototype (`shared.jsx`, `pages.jsx`, `dashboard.jsx`, `auth-admin.jsx`, `device-admin.jsx`) is the starting point for layout/styling, not a spec: where the live code deliberately deviates from it (unslop stages A and B, #151–#189), the live code wins. The old `furchert-ch-website-spec.md` is **not** followed — it was superseded.

### Secrets
- Plaintext secrets in git: **forbidden**. No secret values in code, env files committed to git, tests, or k8s manifests (use `secretKeyRef`).
- Secrets are SOPS + age encrypted by the user, never by Claude; Claude never reads or edits `*.sops.*` files — name the file and key and hand it to the user.

### SEO / GEO
- Every public page builds `generateMetadata` with `buildPageMetadata` (`src/lib/seo/metadata.ts`): canonical, hreflang, OpenGraph and Twitter come from there, never by hand.
- A new public page also gets a path in `src/app/sitemap.ts` and a date in `src/lib/seo/pages.ts`. Bump a page's date when its main content, its structured data or the links in its content change; header/footer changes do not count.
- JSON-LD (`src/lib/seo/jsonLd.ts`) states only what the page shows and never e-mail, phone or address, and never Offer or price markup (`offers`, `price`, `priceRange`, ...). No amount in CHF appears anywhere in JSON-LD: a FAQ entry that names prices stays visible, carries `markup: false` and is left out of the FAQPage (`faqsForMarkup`, /automation, #145). Reuse the `WEBSITE_ID` / `PERSON_ID` ids.
- `public/llms.txt` repeats the /automation offer: its prices are the English price phrases of the page, word for word, and its "Prices as of <Month YYYY>" matches the month of `PAGE_LAST_MODIFIED['/automation']`. `src/i18n/automationCopy.test.ts` checks both, so changing a price or moving the /automation date into a new month means editing `llms.txt` in the same PR.
- A call to action that leads to `/contact` uses `contactHref(<id>)` from `src/data/contact-sources.ts`; a new button gets its own id in `FROM_IDS`. `/automation` and the home page never import `src/app/[locale]/contact/*`, `src/lib/contact/*` or `src/contact.env.ts`.

### Automation = static offer page
- `/automation` is a static offer page without any AI backend: no Claude API, no AI endpoint, no persistence; its examples are illustrative. `/automation/scan` is retired and redirects.
