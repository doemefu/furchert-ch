// Test-side mirror of data-service's per-event validation (spec 100 §6.2;
// data-service INTERFACES.md §1b "Per event", rule order shape, enum, range,
// time, path). Used only by tests, to prove that what forwardModel.ts builds
// is accepted and that the copied C13 fixtures classify the same way. Not
// imported by application code.
import type { ForwardEvent } from './forwardModel';

export type Outcome = 'accepted' | `rejected:${'shape' | 'enum' | 'range' | 'time' | 'path'}`;

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const HOST = /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/;
const UTM = /^[a-z0-9._+-]{1,64}$/;
const PATH = /^\/([a-z0-9][a-z0-9-]{0,63}(\/[a-z0-9][a-z0-9-]{0,63}){0,2})?$/;
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/;

const TYPES = ['pageview', 'engagement', 'click', 'goal', 'enquiry'];
const CONTEXT = ['landing', 'referrerDomain', 'utmSource', 'utmMedium', 'utmCampaign', 'country', 'deviceClass', 'browserFamily', 'osFamily', 'viewport'];
const ENGAGEMENT = ['engagedMs', 'scrollMax', 'fits', 'sectionMask', 'formStarted'];
const CLICK = ['clickKind', 'clickTarget', 'clickArea'];
const CORE = ['visitorId', 'pageviewId', 'seq', 'path', 'locale'];

const isNull = (e: ForwardEvent, keys: string[]) => keys.every((k) => e[k as keyof ForwardEvent] === null);
const notNull = (e: ForwardEvent, keys: string[]) => keys.every((k) => e[k as keyof ForwardEvent] !== null);
const utmOk = (v: unknown) => v === null || (typeof v === 'string' && UTM.test(v) && !/\d{6,}/.test(v));

function shapeOk(e: ForwardEvent): boolean {
  if (typeof e.eventId !== 'string' || !UUID_V4.test(e.eventId)) return false;
  const uuidOrNull = (v: unknown) => v === null || (typeof v === 'string' && UUID_V4.test(v));
  if (!uuidOrNull(e.visitorId) || !uuidOrNull(e.pageviewId)) return false;
  switch (e.type) {
    case 'enquiry':
      return isNull(e, [...CORE, ...CONTEXT, ...ENGAGEMENT, ...CLICK, 'goal']);
    case 'goal':
      return notNull(e, ['visitorId', 'path', 'locale', 'goal']) && isNull(e, ['pageviewId', 'seq', ...CONTEXT, ...ENGAGEMENT, ...CLICK]);
    case 'pageview': {
      if (!notNull(e, [...CORE, 'landing', 'deviceClass', 'browserFamily', 'osFamily'])) return false;
      if (!isNull(e, [...ENGAGEMENT, ...CLICK, 'goal'])) return false;
      if (e.landing === false && !isNull(e, ['referrerDomain', 'utmSource', 'utmMedium', 'utmCampaign'])) return false;
      if (e.referrerDomain !== null && !(typeof e.referrerDomain === 'string' && HOST.test(e.referrerDomain))) return false;
      return utmOk(e.utmSource) && utmOk(e.utmMedium) && utmOk(e.utmCampaign);
    }
    case 'engagement':
      return notNull(e, [...CORE, ...ENGAGEMENT]) && isNull(e, [...CONTEXT, ...CLICK, 'goal']);
    case 'click': {
      if (!notNull(e, [...CORE, 'clickKind', 'clickArea']) || !isNull(e, [...CONTEXT, ...ENGAGEMENT, 'goal'])) return false;
      const t = e.clickTarget;
      switch (e.clickKind) {
        case 'mailto':
        case 'tel':
          return t === null;
        case 'cta':
        case 'link':
        case 'faq':
          return typeof t === 'string' && ID.test(t);
        case 'lang':
          return t === 'de' || t === 'en';
        case 'outbound':
          return typeof t === 'string' && HOST.test(t);
        case 'nav':
          return typeof t === 'string';
        default:
          return t !== null; // an unknown kind fails in the enum stage
      }
    }
  }
  return false;
}

function enumOk(e: ForwardEvent): boolean {
  const inSet = (v: unknown, set: string[]) => v === null || (typeof v === 'string' && set.includes(v));
  if (!inSet(e.locale, ['de', 'en'])) return false;
  if (!inSet(e.deviceClass, ['mobile', 'tablet', 'desktop', 'other'])) return false;
  if (!inSet(e.browserFamily, ['chrome', 'firefox', 'safari', 'edge', 'other'])) return false;
  if (!inSet(e.osFamily, ['ios', 'android', 'windows', 'macos', 'linux', 'other'])) return false;
  if (!inSet(e.viewport, ['<480', '480-767', '768-1023', '1024-1439', '>=1440'])) return false;
  if (!inSet(e.clickKind, ['cta', 'link', 'faq', 'lang', 'nav', 'outbound', 'mailto', 'tel'])) return false;
  if (!inSet(e.clickArea, ['header', 'footer', 'main'])) return false;
  if (!inSet(e.goal, ['contact_submit'])) return false;
  if (e.country !== null && !(typeof e.country === 'string' && /^[A-Z]{2}$/.test(e.country) && e.country !== 'XX' && e.country !== 'T1')) return false;
  return true;
}

function rangeOk(e: ForwardEvent): boolean {
  if (e.seq !== null) {
    if (e.type === 'pageview' && e.seq !== 0) return false;
    if ((e.type === 'engagement' || e.type === 'click') && (typeof e.seq !== 'number' || e.seq < 1 || e.seq > 99)) return false;
  }
  if (e.engagedMs !== null && (typeof e.engagedMs !== 'number' || e.engagedMs < 0 || e.engagedMs > 1_800_000)) return false;
  if (e.scrollMax !== null && ![0, 25, 50, 75, 90, 100].includes(e.scrollMax as number)) return false;
  if (e.sectionMask !== null && (typeof e.sectionMask !== 'number' || e.sectionMask < 0 || e.sectionMask > 255)) return false;
  return true;
}

function timeOk(e: ForwardEvent, nowMs: number): boolean {
  if (typeof e.occurredAt !== 'string' || typeof e.receivedAt !== 'string') return false;
  if (!INSTANT.test(e.occurredAt) || !INSTANT.test(e.receivedAt)) return false;
  const occ = Date.parse(e.occurredAt);
  const rec = Date.parse(e.receivedAt);
  if (Number.isNaN(occ) || Number.isNaN(rec)) return false;
  if (rec < nowMs - 2 * 3_600_000 || rec > nowMs + 60_000) return false;
  return occ <= rec && occ >= rec - 15 * 60_000;
}

function pathOk(e: ForwardEvent): boolean {
  const okPath = (v: unknown) => typeof v === 'string' && v.length <= 200 && PATH.test(v);
  if (e.path !== null && !okPath(e.path)) return false;
  if (e.clickKind === 'nav' && !(e.clickTarget === '(other)' || okPath(e.clickTarget))) return false;
  return true;
}

export function classify(e: ForwardEvent, nowMs: number): Outcome {
  if (typeof e.type !== 'string' || !TYPES.includes(e.type)) return 'rejected:enum';
  if (!shapeOk(e)) return 'rejected:shape';
  if (!enumOk(e)) return 'rejected:enum';
  if (!rangeOk(e)) return 'rejected:range';
  if (!timeOk(e, nowMs)) return 'rejected:time';
  if (!pathOk(e)) return 'rejected:path';
  return 'accepted';
}
