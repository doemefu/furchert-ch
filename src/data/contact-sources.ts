// Which call to action brought a visitor to /contact: every CTA links to
// `/contact?from=<id>`, so enquiries can be counted per button without
// cookies (#145). A neutral data module, so /automation and the home page
// can build the links without importing the contact surface (see the
// isolation note in src/app/[locale]/contact/actions.ts). The contact page
// ignores the parameter until the form reads it (#145, part 2).
export const FROM_IDS = [
  'automation-hero',
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

/** Locale-free href for `Link`/`Btn` from `@/i18n/navigation`. */
export function contactHref(id: FromId): string {
  return `/contact?from=${id}`;
}
