// The event model furchert-ch forwards to data-service (spec 100 §6.2, C13;
// §5.6 time; §5.9 goal and enquiry). Every one of the 28 fields is always
// present, `null` where it does not apply. Built only from validated values
// (envelope.ts, ua.ts); never from the raw request, never with IP or UA.
import type { SiteLocale } from '../registry';
import type { CanonicalEvent, Viewport } from './envelope';
import type { DeviceContext } from './ua';

export const FORWARD_FIELDS = [
  'eventId', 'type', 'occurredAt', 'receivedAt', 'visitorId', 'pageviewId', 'seq', 'path', 'locale', 'landing',
  'referrerDomain', 'utmSource', 'utmMedium', 'utmCampaign', 'country', 'deviceClass', 'browserFamily', 'osFamily',
  'viewport', 'engagedMs', 'scrollMax', 'fits', 'sectionMask', 'formStarted', 'clickKind', 'clickTarget', 'clickArea',
  'goal',
] as const;

export type ForwardEvent = Record<(typeof FORWARD_FIELDS)[number], string | number | boolean | null>;

export const EDGE_DROP_REASONS = [
  'bot', 'signed_in', 'consent', 'invalid', 'path', 'rate_limited', 'mint_limited', 'overflow', 'expired',
] as const;
export type EdgeDropReason = (typeof EDGE_DROP_REASONS)[number];
export type EdgeDrops = Record<EdgeDropReason, number>;
export const EDGE_DROP_MAX = 1_000_000;

export const zeroDrops = (): EdgeDrops =>
  Object.fromEntries(EDGE_DROP_REASONS.map((r) => [r, 0])) as EdgeDrops;

const FIFTEEN_MIN = 15 * 60_000;
const iso = (ms: number) => new Date(ms).toISOString();

/** §5.6: occurredAt = receivedAt − (sentAt − ts) if 0 ≤ sentAt − ts ≤ 15 min, else receivedAt. */
export function occurredAtMs(receivedAtMs: number, sentAt: number, ts: number): number {
  const lag = sentAt - ts;
  return lag >= 0 && lag <= FIFTEEN_MIN ? receivedAtMs - lag : receivedAtMs;
}

const empty = (): ForwardEvent => Object.fromEntries(FORWARD_FIELDS.map((f) => [f, null])) as ForwardEvent;

export interface CollectContext {
  visitorId: string;
  receivedAtMs: number;
  sentAt: number;
  viewport: Viewport | null;
  device: DeviceContext;
}

export function toForwardEvent(c: CanonicalEvent, ctx: CollectContext): ForwardEvent {
  const e = empty();
  e.eventId = c.eventId;
  e.type = c.type;
  e.receivedAt = iso(ctx.receivedAtMs);
  e.occurredAt = iso(occurredAtMs(ctx.receivedAtMs, ctx.sentAt, c.ts));
  e.visitorId = ctx.visitorId;
  e.pageviewId = c.pageviewId;
  e.seq = c.seq;
  e.path = c.path;
  e.locale = c.locale;
  if (c.type === 'pageview') {
    e.landing = c.landing;
    if (c.landing) {
      e.referrerDomain = c.referrerDomain;
      e.utmSource = c.utmSource;
      e.utmMedium = c.utmMedium;
      e.utmCampaign = c.utmCampaign;
    }
    e.country = ctx.device.country;
    e.deviceClass = ctx.device.deviceClass;
    e.browserFamily = ctx.device.browserFamily;
    e.osFamily = ctx.device.osFamily;
    e.viewport = ctx.viewport;
  } else if (c.type === 'engagement') {
    e.engagedMs = c.engagedMs;
    e.scrollMax = c.scrollMax;
    e.fits = c.fits;
    e.sectionMask = c.sectionMask;
    e.formStarted = c.formStarted;
  } else {
    e.clickKind = c.clickKind;
    e.clickTarget = c.clickTarget;
    e.clickArea = c.clickArea;
  }
  return e;
}

/** §5.9: the contact goal; the eventId is generated here, never taken from the client. */
export function goalEvent(visitorId: string, locale: SiteLocale, nowMs: number): ForwardEvent {
  const e = empty();
  Object.assign(e, {
    eventId: crypto.randomUUID(),
    type: 'goal',
    occurredAt: iso(nowMs),
    receivedAt: iso(nowMs),
    visitorId,
    path: '/contact',
    locale,
    goal: 'contact_submit',
  });
  return e;
}

/** §5.9: the consent-free enquiry count; only the four core fields are set. */
export function enquiryEvent(nowMs: number): ForwardEvent {
  const e = empty();
  Object.assign(e, { eventId: crypto.randomUUID(), type: 'enquiry', occurredAt: iso(nowMs), receivedAt: iso(nowMs) });
  return e;
}
