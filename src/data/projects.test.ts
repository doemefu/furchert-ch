// Project status → status LED (#177): every status has an LED and a label in both locales.
import { describe, expect, it } from 'vitest';
import { PROJECT_DOT, STATUS_LABEL } from './projects';

const STATUSES = ['live', 'wip', 'planned', 'done'] as const;
const DOT_STATUSES = ['online', 'wip', 'repo', 'offline', 'unknown'];

describe('project status', () => {
  it('PROJECT_DOT covers every status with a valid dot status', () => {
    expect(Object.keys(PROJECT_DOT).sort()).toEqual([...STATUSES].sort());
    for (const s of STATUSES) expect(DOT_STATUSES, s).toContain(PROJECT_DOT[s]);
  });

  it('every status has a non-empty DE and EN label', () => {
    for (const locale of ['de', 'en'] as const) {
      expect(Object.keys(STATUS_LABEL[locale]).sort(), locale).toEqual([...STATUSES].sort());
      for (const s of STATUSES) expect(STATUS_LABEL[locale][s].trim(), `${locale}.${s}`).not.toBe('');
    }
  });
});
