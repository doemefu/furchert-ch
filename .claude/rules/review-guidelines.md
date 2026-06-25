# Review Guidelines

- Never log or expose secrets, tokens, or credentials in any form. OIDC access tokens stay server-side (route handlers / server components), never shipped to the browser.
- Keep diffs minimal; no unrelated refactors, no style-only churn.
- All dependency versions pinned (no `latest`, no `^`/`~` ranges); Docker base image pinned.
- Backend calls go to cluster-internal FQDNs server-side; verify role gating (`role=ADMIN`) for admin actions matches `../auth-service/INTERFACES.md` / `../device-service/INTERFACES.md`.
- Verify `/automation` stays a mockup: no outbound network calls, no scan API routes, no fake "success" presented as real.
- Pixel fidelity: the implemented UI must match the prototype source for the touched page (tokens, spacing, the `.border-x` grid, DE + EN).
- Surfaces without a real backend endpoint must be shown as clearly-labelled placeholders — never fabricated data presented as live.
- k8s manifests: resource `requests`+`limits` set, liveness+readiness probes, namespace `apps`, image not `latest`, secrets via `secretKeyRef`.
