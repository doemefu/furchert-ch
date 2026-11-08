// Dark-launch switch for first-party web analytics (spec 100 §1.4, Epic
// doemefu/homelab#348). While false, the consent bar, the footer's privacy
// settings link and (from WA-2b) the tracker are not rendered at all. It is
// flipped only in the WA-6 go-live PR (#158), together with the privacy text
// in `src/data/legal.ts`; `source.test.ts` pins the value until then.
// Typed as `boolean` so call sites are not narrowed to dead code.
export const ANALYTICS_UI_ENABLED: boolean = false;
