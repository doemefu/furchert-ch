// Strict schema of the `POST /api/v` body (spec 100 §5.2, §5.3 step 9, C2)
// and per-event canonicalisation (step 11, §5.5, C7/C8). The envelope check
// is structural: unknown or missing keys, wrong JSON types, depth, string
// length and the event count fail the whole request (400). Value rules
// (UUIDs, enums, ranges, registries) drop a single event. Never throws.
import { isTrackId } from '@/data/track-ids';
import { canonicalNavTarget, canonicalPath, isTracked, type SiteLocale } from '../registry';

export const VIEWPORTS = ['<480', '480-767', '768-1023', '1024-1439', '>=1440'] as const;
export type Viewport = (typeof VIEWPORTS)[number];
export const CLICK_KINDS = ['cta', 'link', 'faq', 'lang', 'nav', 'outbound', 'mailto', 'tel'] as const;
export type ClickKind = (typeof CLICK_KINDS)[number];
export const CLICK_AREAS = ['header', 'footer', 'main'] as const;
export type ClickArea = (typeof CLICK_AREAS)[number];
const SCROLL_STEPS = [0, 25, 50, 75, 90, 100];

type Json = string | number | boolean | null;
export type RawEvent = Record<string, Json>;

export interface Envelope {
  v: 1;
  cv: number;
  consentDate: string;
  sentAt: number;
  viewport: string | null;
  events: RawEvent[];
}

const ENVELOPE_KEYS = ['consentDate', 'cv', 'events', 'sentAt', 'v', 'viewport'];
const COMMON = ['eventId', 'type', 'ts', 'pageviewId', 'seq', 'path'];
const EVENT_KEYS: Record<string, string[]> = {
  pageview: [...COMMON, 'landing', 'referrerHost', 'utmSource', 'utmMedium', 'utmCampaign'],
  engagement: [...COMMON, 'engagedMs', 'scrollMax', 'fits', 'sectionMask', 'formStarted'],
  click: [...COMMON, 'kind', 'target', 'area'],
};
const ANY_EVENT_KEY = new Set(Object.values(EVENT_KEYS).flat());
const MAX_STRING = 128;
const MAX_PATH = 512;

const sameKeys = (obj: object, keys: string[]) => {
  const k = Object.keys(obj);
  return k.length === keys.length && keys.every((key) => Object.hasOwn(obj, key));
};
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v);

/** Step 9. `null` = 400. */
export function parseEnvelope(text: string): Envelope | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const e = value as Record<string, unknown>;
  if (!sameKeys(e, ENVELOPE_KEYS)) return null;
  if (e.v !== 1 || !isInt(e.cv) || !isInt(e.sentAt)) return null;
  if (typeof e.consentDate !== 'string' || e.consentDate.length > MAX_STRING) return null;
  if (e.viewport !== null && (typeof e.viewport !== 'string' || e.viewport.length > MAX_STRING)) return null;
  if (!Array.isArray(e.events) || e.events.length < 1 || e.events.length > 20) return null;
  for (const ev of e.events) {
    if (typeof ev !== 'object' || ev === null || Array.isArray(ev)) return null;
    const keys = Object.keys(ev);
    // Unknown keys anywhere fail the request; the exact set per known type too.
    if (keys.some((k) => !ANY_EVENT_KEY.has(k))) return null;
    const type = (ev as Record<string, unknown>).type;
    if (typeof type === 'string' && EVENT_KEYS[type] && !sameKeys(ev, EVENT_KEYS[type])) return null;
    for (const [k, v] of Object.entries(ev)) {
      if (v !== null && typeof v !== 'string' && typeof v !== 'number' && typeof v !== 'boolean') return null;
      if (typeof v === 'number' && !Number.isFinite(v)) return null;
      if (typeof v === 'string' && v.length > (k === 'path' ? MAX_PATH : MAX_STRING)) return null;
    }
  }
  return e as unknown as Envelope;
}

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const isUuidV4 = (v: unknown): v is string => typeof v === 'string' && UUID_V4.test(v);

/** NFKC, lowercase, trim, spaces → `_`; dropped (null) unless it fits the rule. */
export function canonicalUtm(raw: Json): string | null {
  if (typeof raw !== 'string') return null;
  const v = raw.normalize('NFKC').toLowerCase().trim().replace(/\s+/g, '_');
  if (!/^[a-z0-9._+-]{1,64}$/.test(v) || /\d{6,}/.test(v)) return null;
  return v;
}

/** Lowercase punycode host without `www.`; null for furchert.ch or anything malformed. */
export function canonicalHost(raw: Json): string | null {
  if (typeof raw !== 'string' || raw.length === 0 || /[/:?#@\s\\]/.test(raw)) return null;
  let host: string;
  try {
    host = new URL(`http://${raw}`).hostname;
  } catch {
    return null;
  }
  host = host.replace(/^www\./, '');
  if (!/^[a-z0-9.-]{1,253}$/.test(host) || !host.includes('.') || host.startsWith('.') || host.endsWith('.')) return null;
  if (host === 'furchert.ch' || host.endsWith('.furchert.ch')) return null;
  return host;
}

export interface CanonicalEvent {
  eventId: string;
  type: 'pageview' | 'engagement' | 'click';
  ts: number;
  pageviewId: string;
  seq: number;
  path: string;
  locale: SiteLocale;
  landing: boolean | null;
  referrerDomain: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  engagedMs: number | null;
  scrollMax: number | null;
  fits: boolean | null;
  sectionMask: number | null;
  formStarted: boolean | null;
  clickKind: ClickKind | null;
  clickTarget: string | null;
  clickArea: ClickArea | null;
}

export type Canonical = { ok: true; event: CanonicalEvent } | { ok: false; reason: 'invalid' | 'path' };

const INVALID: Canonical = { ok: false, reason: 'invalid' };

function clickTarget(kind: ClickKind, raw: Json): string | null | undefined {
  switch (kind) {
    case 'cta':
    case 'link':
    case 'faq':
      return typeof raw === 'string' && isTrackId(kind, raw) ? raw : undefined;
    case 'lang':
      return raw === 'de' || raw === 'en' ? raw : undefined;
    case 'outbound':
      return canonicalHost(raw) ?? undefined;
    case 'mailto':
    case 'tel':
      return null; // never the address or number
    case 'nav':
      return typeof raw === 'string' ? canonicalNavTarget(raw) : undefined;
  }
}

/** Step 11: one event to the locale-free, minimised model, or a drop reason. */
export function canonicalEvent(e: RawEvent): Canonical {
  const type = e.type;
  if (type !== 'pageview' && type !== 'engagement' && type !== 'click') return INVALID; // incl. a posted `goal`
  if (!isUuidV4(e.eventId) || !isUuidV4(e.pageviewId) || !isInt(e.ts) || !isInt(e.seq)) return INVALID;
  if (type === 'pageview' ? e.seq !== 0 : e.seq < 1 || e.seq > 99) return INVALID;
  if (typeof e.path !== 'string') return INVALID;
  const where = canonicalPath(e.path);
  if (!where || !isTracked(where.path)) return { ok: false, reason: 'path' };

  const base: CanonicalEvent = {
    eventId: e.eventId,
    type,
    ts: e.ts,
    pageviewId: e.pageviewId,
    seq: e.seq,
    path: where.path,
    locale: where.locale,
    landing: null,
    referrerDomain: null,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    engagedMs: null,
    scrollMax: null,
    fits: null,
    sectionMask: null,
    formStarted: null,
    clickKind: null,
    clickTarget: null,
    clickArea: null,
  };

  if (type === 'pageview') {
    if (typeof e.landing !== 'boolean') return INVALID;
    base.landing = e.landing;
    // Referrer and UTM count only on a landing pageview (§3.4, M3).
    if (e.landing) {
      base.referrerDomain = canonicalHost(e.referrerHost);
      base.utmSource = canonicalUtm(e.utmSource);
      base.utmMedium = canonicalUtm(e.utmMedium);
      base.utmCampaign = canonicalUtm(e.utmCampaign);
    }
    return { ok: true, event: base };
  }

  if (type === 'engagement') {
    const { engagedMs, scrollMax, fits, sectionMask, formStarted } = e;
    if (!isInt(engagedMs) || engagedMs < 0 || engagedMs > 1_800_000) return INVALID;
    if (!isInt(scrollMax) || !SCROLL_STEPS.includes(scrollMax)) return INVALID;
    if (!isInt(sectionMask) || sectionMask < 0 || sectionMask > 255) return INVALID;
    if (typeof fits !== 'boolean' || typeof formStarted !== 'boolean') return INVALID;
    Object.assign(base, { engagedMs, scrollMax, fits, sectionMask, formStarted });
    return { ok: true, event: base };
  }

  const kind = e.kind;
  if (typeof kind !== 'string' || !(CLICK_KINDS as readonly string[]).includes(kind)) return INVALID;
  if (typeof e.area !== 'string' || !(CLICK_AREAS as readonly string[]).includes(e.area)) return INVALID;
  const target = clickTarget(kind as ClickKind, e.target);
  if (target === undefined) return INVALID;
  base.clickKind = kind as ClickKind;
  base.clickTarget = target;
  base.clickArea = e.area as ClickArea;
  return { ok: true, event: base };
}

export function canonicalViewport(raw: string | null): Viewport | null {
  return raw !== null && (VIEWPORTS as readonly string[]).includes(raw) ? (raw as Viewport) : null;
}
