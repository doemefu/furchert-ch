// Which call to action brought a visitor to /contact: every CTA links to
// `/contact?from=<id>`, so enquiries can be counted per button without
// cookies (#145). A neutral data module, so /automation and the home page
// can build the links without importing the contact surface (see the
// isolation note in src/app/[locale]/contact/actions.ts).
//
// The contact form reads `from` once after hydration and keeps it only if it
// is on FROM_IDS; the optional «Wie sind Sie auf mich aufmerksam geworden?»
// select offers HEARD_VIA_IDS. The server action checks both against these
// lists again, drops unknown values without logging them, and the mail names
// them as «Quelle:» and «Aufmerksam geworden:» (the label comes from
// HEARD_VIA_MAIL_LABELS, never from the submitted text).
export const FROM_IDS = [
  'automation-hero',
  'automation-callback',
  'automation-tile-rapport',
  'automation-tile-offerte',
  'automation-tile-uebersicht',
  'automation-example',
  'automation-prices',
  'automation-about',
  'automation-final',
  'automation-sticky',
  'home-cta',
] as const;

export type FromId = (typeof FROM_IDS)[number];

export function isFromId(value: unknown): value is FromId {
  return typeof value === 'string' && (FROM_IDS as readonly string[]).includes(value);
}

/** Locale-free href for `Link`/`Btn` from `@/i18n/navigation`. */
export function contactHref(id: FromId): string {
  return `/contact?from=${id}`;
}

export const HEARD_VIA_IDS = ['search', 'ai', 'referral', 'linkedin', 'event', 'other'] as const;

export type HeardViaId = (typeof HEARD_VIA_IDS)[number];

export function isHeardVia(value: unknown): value is HeardViaId {
  return typeof value === 'string' && (HEARD_VIA_IDS as readonly string[]).includes(value);
}

/** Message key of the visible option, e.g. `heardViaLinkedin` in `contact.*`. */
export function heardViaMessageKey(id: HeardViaId): string {
  return `heardVia${id.charAt(0).toUpperCase()}${id.slice(1)}`;
}

/** The German label the mail to the owner uses for each option. */
export const HEARD_VIA_MAIL_LABELS: Record<HeardViaId, string> = {
  search: 'Google oder andere Suche',
  ai: 'ChatGPT oder anderer KI-Assistent',
  referral: 'Empfehlung',
  linkedin: 'LinkedIn',
  event: 'Anlass oder Gewerbeverein',
  other: 'Anderes',
};
