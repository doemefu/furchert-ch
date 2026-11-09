// Allowlisted labels for values from the WA-3b read endpoints (spec 100 rev
// 3.5 §8.2; review M6). A known value gets its translated label, `null`
// ("none" key) reads "unknown", and anything else renders as its raw text,
// never used as a message key.
import type { Translate } from './ui';

const allow =
  (map: Record<string, string>) =>
  (value: string | null, t: Translate): string =>
    value === null ? t('unknown') : Object.hasOwn(map, value) ? t(map[value]) : value;

export const funnelLabel = allow({ offer: 'funnels.ids.offer', contact_form: 'funnels.ids.contactForm' });
export const stepLabel = allow({
  visit: 'funnels.steps.visit',
  offer_visit: 'funnels.steps.offerVisit',
  reached_prices: 'funnels.steps.reachedPrices',
  contact_intent: 'funnels.steps.contactIntent',
  form_start: 'funnels.steps.formStart',
  contact_submit: 'funnels.steps.contactSubmit',
  contact_pageview: 'funnels.steps.contactPageview',
});
const groupToken = allow({
  home: 'paths.groups.home',
  offer: 'paths.groups.offer',
  proof: 'paths.groups.proof',
  personal: 'paths.groups.personal',
  contact: 'paths.groups.contact',
  other: 'paths.groups.other',
  '…': 'paths.groups.more',
  '(exit)': 'paths.groups.exit',
});
/** "home > offer > (exit)" → translated tokens joined by "›". */
export const groupPathText = (path: string | null, t: Translate): string =>
  path === null ? t('unknown') : path.split(' > ').map((tok) => groupToken(tok, t)).join(' › ');
export const seenLabel = allow({ about: 'paths.seenValues.about', projects: 'paths.seenValues.projects', prices: 'paths.seenValues.prices', none: 'paths.seenValues.none' });
export const visitorTypeLabel = allow({ new: 'audience.new', returning: 'audience.returning' });
export const flowLabel = allow({ '(entrance)': 'flow.entrance', '(exit)': 'flow.exit' });
export const deviceLabel = allow({ desktop: 'controls.desktop', mobile: 'controls.mobile', tablet: 'controls.tablet', other: 'audience.otherDevice' });
/** Visitor-count basis (overview visitors, repeat offer viewers); review N4. */
export const basisLabel = allow({ '7d': 'glance.basis7d', '28d': 'glance.basis28d', month: 'glance.basisMonth' });
export const localeLabel = allow({ de: 'controls.de', en: 'controls.en' });
/** Open dimension values (country, browser, OS, viewport): raw text, null → unknown. */
export const rawLabel = (value: string | null, t: Translate): string => (value === null ? t('unknown') : value);
