# homelab-furchert-ch — Overview

> Stub — filled in parallel with each milestone (see `.claude/rules/documentation-files.md`).

## What this is

`furchert-ch` is the homelab's single Next.js frontend: a public personal website
plus a private, OIDC-gated control surface for the cluster. One frontend serves the
whole cluster — there is no separate admin app.

## Surfaces

### Public (real)
| Route | Page |
|-------|------|
| `/[locale]` | Home (hero, experience/engagement, teasers, stats, CTA) |
| `/[locale]/about` | About (bio, facts, timeline, interests) |
| `/[locale]/it` | IT & Tech |
| `/[locale]/rowing` | Rowing |
| `/[locale]/projects`, `/projects/[slug]` | Projects + detail |
| `/[locale]/contact` | Contact |

Locales: `de` (default) and `en`; `/` redirects to `/de`.

### Automation (MOCKUP ONLY)
| Route | Page |
|-------|------|
| `/[locale]/automation` | Business landing — static mockup |
| `/[locale]/automation/scan` | Scanner wizard — static visual mockup, no backend |

No Claude API, no `/api/scan/*`, no persistence. Non-functional by design.

### Private (real, OIDC-gated via auth.furchert.ch)
| Route | Page |
|-------|------|
| `/[locale]/dashboard` | Homelab overview (cluster nodes, app/service tiles) |
| `/[locale]/dashboard/auth` | auth-service admin GUI (real REST API) |
| `/[locale]/dashboard/devices` | device-service admin GUI (real REST API) |

## Real vs. mock vs. deferred

- **Real:** public site, OIDC dashboard auth, dashboard overview, admin GUIs wired to backend.
- **Mock:** the entire `/automation` section.
- **Deferred (out of scope for now):** AI scan backend, lead dashboard, rate
  limiting/Turnstile, n8n notifications, live cluster metrics, WebSocket device
  stream. Tracked here as work progresses.

(Detailed feature/route descriptions added per milestone.)
