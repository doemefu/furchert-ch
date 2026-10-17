import { describe, expect, it } from 'vitest';
import { asRole } from './auth.config';

describe('asRole', () => {
  it('passes only the exact string ADMIN through', () => {
    expect(asRole('ADMIN')).toBe('ADMIN');
  });

  it('collapses everything else to USER', () => {
    for (const v of ['USER', 'admin', 'Admin', ' ADMIN', 'ADMIN ', '', 'ROLE_ADMIN', ['ADMIN'], { role: 'ADMIN' }, 1, true, null, undefined]) {
      expect(asRole(v)).toBe('USER');
    }
  });
});
