// C13 contract test (spec 100 §6.2, WA-2b #154): the fixtures are a verbatim
// copy of data-service `src/test/resources/webanalytics/c13-fixtures.json`
// at doemefu/homelab-data-service@171c42da41e46e9b71478d09df9197cc1cc8e3d1
// (the commit on `main` that last changed the file, merged with #58). When
// data-service changes the file, copy it again and update the commit and the
// hash below.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { classify } from './c13Mirror';
import { canonicalEvent, type RawEvent } from './envelope';
import { click, engagement, pageview } from './testEvents';
import { FORWARD_FIELDS, enquiryEvent, goalEvent, occurredAtMs, toForwardEvent, type ForwardEvent } from './forwardModel';

const FILE = join(process.cwd(), 'src/lib/analytics/server/fixtures/c13-fixtures.json');
const raw = readFileSync(FILE);
const fixtures = JSON.parse(raw.toString('utf8')) as {
  version: number;
  bases: Record<string, Record<string, unknown>>;
  cases: { name: string; base: string; set: Record<string, unknown>; expect: string }[];
};

const NOW = Date.parse('2026-11-08T15:00:00.000Z');
function materialise(value: unknown): unknown {
  if (value === '<uuid>') return crypto.randomUUID();
  if (typeof value === 'string') {
    const m = /^now([+-])(\d+)m$/.exec(value);
    if (m) return new Date(NOW + (m[1] === '+' ? 1 : -1) * Number(m[2]) * 60_000).toISOString();
  }
  return value;
}
const build = (base: string, set: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries({ ...fixtures.bases[base], ...set }).map(([k, v]) => [k, materialise(v)]),
  ) as ForwardEvent;

describe('C13 fixtures (copied from data-service)', () => {
  it('is the pinned file version', () => {
    expect(fixtures.version).toBe(1);
    expect(createHash('sha256').update(raw).digest('hex')).toBe(
      '520610c3ae8114eb6633d151079f5459db52d546a4ed9e86ca7e22abacb853be',
    );
  });

  it('every base has exactly the 28 forward fields', () => {
    for (const base of Object.values(fixtures.bases)) expect(Object.keys(base).sort()).toEqual([...FORWARD_FIELDS].sort());
  });

  for (const c of fixtures.cases) {
    it(`mirror: ${c.name} → ${c.expect}`, () => {
      expect(classify(build(c.base, c.set), NOW)).toBe(c.expect);
    });
  }
});

describe('forwardModel output is accepted by the mirror', () => {
  const device = { country: 'CH', deviceClass: 'desktop', browserFamily: 'firefox', osFamily: 'macos' } as const;
  const ctx = { visitorId: crypto.randomUUID(), receivedAtMs: NOW - 1000, sentAt: NOW - 500, viewport: '1024-1439' as const, device };
  const forward = (e: RawEvent) => {
    const c = canonicalEvent({ ...e, ts: NOW - 30_000 });
    if (!c.ok) throw new Error(`fixture event dropped: ${c.reason}`);
    return toForwardEvent(c.event, ctx);
  };

  const cases: [string, RawEvent][] = [
    ['landing pageview', pageview()],
    ['landing=false with a referrer sent by mistake (M3)', pageview({ landing: false, referrerHost: 'google.com', utmSource: 'x' })],
    ['engagement', engagement()],
    ['cta click', click()],
    ['mailto click with an address', click({ kind: 'mailto', target: 'mailto:someone@example.com' })],
    ['nav (other)', click({ kind: 'nav', target: '/de/somewhere', area: 'header' })],
    ['nav registered', click({ kind: 'nav', target: '/en/automation', area: 'footer' })],
    ['outbound', click({ kind: 'outbound', target: 'www.linkedin.com' })],
    ['lang', click({ kind: 'lang', target: 'en', area: 'header' })],
  ];
  for (const [name, e] of cases) {
    it(name, () => {
      const out = forward(e);
      expect(Object.keys(out)).toEqual([...FORWARD_FIELDS]);
      expect(classify(out, NOW)).toBe('accepted');
    });
  }

  it('goal and enquiry with server-generated UUID v4 ids', () => {
    const goal = goalEvent(crypto.randomUUID(), 'de', NOW);
    const enquiry = enquiryEvent(NOW);
    expect(classify(goal, NOW)).toBe('accepted');
    expect(classify(enquiry, NOW)).toBe('accepted');
    expect(enquiry.eventId).not.toBe(enquiryEvent(NOW).eventId);
    const nonNull = Object.entries(enquiry).filter(([, v]) => v !== null).map(([k]) => k);
    expect(nonNull.sort()).toEqual(['eventId', 'occurredAt', 'receivedAt', 'type']);
  });
});

describe('occurredAt (§5.6)', () => {
  it('subtracts the client lag within 0..15 min, else uses receivedAt', () => {
    expect(occurredAtMs(1_000_000, 500_000, 400_000)).toBe(900_000);
    expect(occurredAtMs(10_000_000, 2_000_000, 2_000_000 - 15 * 60_000)).toBe(10_000_000 - 15 * 60_000);
    expect(occurredAtMs(10_000_000, 2_000_000, 2_000_000 - 15 * 60_000 - 1)).toBe(10_000_000);
    expect(occurredAtMs(10_000_000, 2_000_000, 2_000_001)).toBe(10_000_000);
  });
});
