import { describe, expect, it } from 'vitest';
import { basisLabel, deviceLabel, flowLabel, groupPathText, seenLabel, stepLabel, visitorTypeLabel } from './labels';
import type { Translate } from './ui';

const t: Translate = (k) => `[${k}]`;

describe('allowlisted labels (M6)', () => {
  it('translates known values, "unknown" for null, raw text otherwise', () => {
    expect(stepLabel('reached_prices', t)).toBe('[funnels.steps.reachedPrices]');
    expect(stepLabel(null, t)).toBe('[unknown]');
    expect(stepLabel('<b>x</b>', t)).toBe('<b>x</b>');
    expect(seenLabel('none', t)).toBe('[paths.seenValues.none]');
    expect(visitorTypeLabel('returning', t)).toBe('[audience.returning]');
    expect(flowLabel('(entrance)', t)).toBe('[flow.entrance]');
    expect(flowLabel('/automation', t)).toBe('/automation');
    expect(deviceLabel('other', t)).toBe('[audience.otherDevice]');
    // #170 review N4: the overview visitors tile and repeat offer viewers share this map.
    expect(['7d', '28d', 'month', '14d'].map((b) => basisLabel(b, t))).toEqual(['[glance.basis7d]', '[glance.basis28d]', '[glance.basisMonth]', '14d']);
  });
  it('never treats a value equal to a message key as a key', () => {
    expect(seenLabel('glance.title', t)).toBe('glance.title');
    expect(stepLabel('toString', t)).toBe('toString');
    expect(seenLabel('__proto__', t)).toBe('__proto__');
  });
  it('splits group paths and maps each token', () => {
    expect(groupPathText('home > offer > … > (exit)', t)).toBe('[paths.groups.home] › [paths.groups.offer] › [paths.groups.more] › [paths.groups.exit]');
    expect(groupPathText('home > <img> > (exit)', t)).toBe('[paths.groups.home] › <img> › [paths.groups.exit]');
    expect(groupPathText(null, t)).toBe('[unknown]');
  });
});
