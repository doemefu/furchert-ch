// Raw client events for tests (the §5.2 example shapes). Test-only module.
import type { RawEvent } from './envelope';

const uuid = () => crypto.randomUUID();
export const pageview = (over: Partial<RawEvent> = {}): RawEvent => ({
  eventId: uuid(), type: 'pageview', ts: 1_762_617_600_000, pageviewId: uuid(), seq: 0, path: '/de/automation',
  landing: true, referrerHost: 'www.google.com', utmSource: 'linkedin', utmMedium: 'social', utmCampaign: '2026-11-ki', ...over,
});
export const engagement = (over: Partial<RawEvent> = {}): RawEvent => ({
  eventId: uuid(), type: 'engagement', ts: 1_762_617_645_000, pageviewId: uuid(), seq: 2, path: '/de/automation',
  engagedMs: 31000, scrollMax: 75, fits: false, sectionMask: 11, formStarted: false, ...over,
});
export const click = (over: Partial<RawEvent> = {}): RawEvent => ({
  eventId: uuid(), type: 'click', ts: 1_762_617_640_000, pageviewId: uuid(), seq: 1, path: '/de/automation',
  kind: 'cta', target: 'automation-hero', area: 'main', ...over,
});
