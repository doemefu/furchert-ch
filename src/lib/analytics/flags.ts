// Switch for first-party web analytics (spec 100 §1.4, Epic
// doemefu/homelab#348). True since the WA-6 go-live (#158, 2026-11-09),
// together with the privacy text in `src/data/legal.ts`: the consent bar, the
// footer's privacy settings link and the tracker are rendered. While false
// they are not rendered at all; `source.test.ts` pins the value.
// Rollback (#158 plan): first ANALYTICS_COLLECT_ENABLED="false" in
// k8s/deployment.yaml (stops collecting, withdrawal keeps working); false here
// only when the consent bar itself is broken, with an owner purge-or-fix
// decision on #158. Never revert the privacy text.
// Typed as `boolean` so call sites are not narrowed to dead code.
export const ANALYTICS_UI_ENABLED: boolean = true;
