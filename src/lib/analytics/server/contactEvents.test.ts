import { describe, expect, it } from 'vitest';
import { recordContactSubmission, type ContactEventDeps } from './contactEvents';
import type { ForwardEvent } from './forwardModel';

const VID = '3f0c2a1e-8b7d-4c6e-9a5f-1b2c3d4e5f60';
function deps(over: Partial<ContactEventDeps> = {}) {
  const out: ForwardEvent[] = [];
  const d: ContactEventDeps = { enqueue: (e) => void out.push(...e), now: () => Date.parse('2026-11-08T15:00:00Z'), uiEnabled: true, collectEnabled: true, ...over };
  return { d, out };
}

describe('recordContactSubmission (§5.9)', () => {
  it('records the enquiry for every submission, also while the UI flag is off', () => {
    const { d, out } = deps({ uiEnabled: false });
    recordContactSubmission({ analytics: true, cookieHeader: `fa_vid=${VID}.1`, locale: 'de' }, d);
    expect(out.map((e) => e.type)).toEqual(['enquiry']);
    expect(Object.entries(out[0]).filter(([, v]) => v !== null).map(([k]) => k).sort()).toEqual(['eventId', 'occurredAt', 'receivedAt', 'type']);
  });

  it('adds the goal only with analytics === true and an existing current fa_vid', () => {
    const goal = deps();
    recordContactSubmission({ analytics: true, cookieHeader: `fa_vid=${VID}.1`, locale: 'en' }, goal.d);
    expect(goal.out.map((e) => e.type)).toEqual(['enquiry', 'goal']);
    expect(goal.out[1]).toMatchObject({ visitorId: VID, path: '/contact', locale: 'en', goal: 'contact_submit', pageviewId: null, seq: null });
    expect(goal.out[1].eventId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4/);

    for (const [analytics, cookieHeader] of [
      [true, null],
      [true, `fa_vid=${VID}.0`],
      ['true', `fa_vid=${VID}.1`],
      [false, `fa_vid=${VID}.1`],
    ] as const) {
      const { d, out } = deps();
      recordContactSubmission({ analytics, cookieHeader, locale: 'de' }, d);
      expect(out.map((e) => e.type), `${analytics} ${cookieHeader}`).toEqual(['enquiry']);
    }
  });

  it('records nothing when signed in or with the collect switch off', () => {
    for (const [over, cookieHeader] of [
      [{}, `fa_vid=${VID}.1; __Secure-authjs.session-token=x`],
      [{ collectEnabled: false }, `fa_vid=${VID}.1`],
    ] as const) {
      const { d, out } = deps(over);
      recordContactSubmission({ analytics: true, cookieHeader, locale: 'de' }, d);
      expect(out).toEqual([]);
    }
  });

  it('never throws', () => {
    const { d } = deps({ enqueue: () => { throw new Error('boom'); } });
    expect(() => recordContactSubmission({ analytics: true, cookieHeader: null, locale: 'de' }, d)).not.toThrow();
  });
});
