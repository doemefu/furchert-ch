// Click and section ids for first-party web analytics (spec 100 §3.3, §3.6,
// §3.7; WA-2b #154). Components mark elements with `data-track="<kind>:<id>"`
// (via `trackAttr`) and /automation sections with `data-track-section`; the
// collect route accepts only these ids. Ids match ^[a-z0-9][a-z0-9-]{0,63}$,
// at most 100 in total (track-ids.test.ts). Never question text or indexes.
import { FROM_IDS } from './contact-sources';

const PROJECT_SLUGS = ['iot-platform', 'homelab', 'club-assist', 'karaokee', 'auth-service', 'aemtlifyer'] as const;

export const SECTION_IDS = [
  'hero',
  'so-arbeite-ich',
  'beispiel',
  'preise',
  'daten',
  'ueber-mich',
  'faq',
  'final',
] as const;

export const TRACK_IDS = {
  /** Contact calls to action: exactly the `?from=` ids. */
  cta: FROM_IDS as readonly string[],
  link: [
    'home-hero-automation',
    'home-hero-projects',
    'home-tile-automation',
    'home-tile-it',
    'home-tile-projects',
    'home-tile-rowing',
    'it-automation',
    'it-projects',
    'about-projects',
    'rowing-projects',
    'automation-tile-example',
    'automation-about-page',
    'contact-automation',
    'project-back',
    ...PROJECT_SLUGS.map((slug) => `project-card-${slug}`),
  ] as readonly string[],
  faq: [
    'cost',
    'fit',
    'buy-self',
    'adoption',
    'swiss-german',
    'monitoring',
    'data-ch',
    'copilot-payroll',
    'access',
    'student-time',
  ] as readonly string[],
  section: SECTION_IDS as readonly string[],
};

export type TrackKind = keyof typeof TRACK_IDS;

export function isTrackId(kind: TrackKind, id: string): boolean {
  return Object.hasOwn(TRACK_IDS, kind) && TRACK_IDS[kind].includes(id);
}

/** `data-track` value for an element: `"<kind>:<id>"`. */
export function trackAttr(kind: Exclude<TrackKind, 'section'>, id: string): string {
  return `${kind}:${id}`;
}
