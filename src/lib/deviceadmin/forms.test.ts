import { describe, expect, it } from 'vitest';
import { hasFieldError, parseActive, parseControl, parseSchedule, parseScheduleId } from './forms';

const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

const schedule = { deviceName: 'terra1', field: 'light', state: '1', cronExpression: '0 0 7 * * *', active: 'on' };

describe('parseControl', () => {
  it('accepts a valid command', () => {
    expect(parseControl(fd({ id: '3', field: 'nightLight', state: '0' }))).toEqual({
      ok: true,
      value: { id: 3, field: 'nightLight', state: 0 },
    });
  });

  it.each([
    [{ id: '1/../../actuator', field: 'light', state: '1' }, { id: 'id' }],
    [{ id: 'abc', field: 'light', state: '1' }, { id: 'id' }],
    [{ id: '0', field: 'light', state: '1' }, { id: 'id' }],
    [{ id: '1', field: 'heater', state: '1' }, { field: 'field' }],
    [{ id: '1', field: 'light', state: '2' }, { state: 'state' }],
    [{ id: '1', field: 'light' }, { state: 'state' }],
  ])('rejects %o', (input, fieldErrors) => {
    expect(parseControl(fd(input as Record<string, string>))).toEqual({ ok: false, fieldErrors });
  });
});

describe('parseSchedule', () => {
  it('parses a create (no id) with the checkbox on', () => {
    expect(parseSchedule(fd(schedule))).toEqual({
      ok: true,
      value: { id: null, deviceName: 'terra1', field: 'light', state: 1, cronExpression: '0 0 7 * * *', active: true },
    });
  });

  it('parses an update and an unchecked checkbox', () => {
    const rest = Object.fromEntries(Object.entries(schedule).filter(([k]) => k !== 'active'));
    const r = parseSchedule(fd({ ...rest, id: '12', state: '0', cronExpression: '  0 */15 * * * *  ' }));
    expect(r).toEqual({
      ok: true,
      value: { id: 12, deviceName: 'terra1', field: 'light', state: 0, cronExpression: '0 */15 * * * *', active: false },
    });
  });

  it('collects every field error at once', () => {
    const r = parseSchedule(fd({ id: 'x', deviceName: 'T1', field: 'heater', state: '', cronExpression: '' }));
    expect(r).toEqual({
      ok: false,
      fieldErrors: { id: 'id', deviceName: 'deviceName', field: 'field', state: 'state', cronExpression: 'cronExpression' },
    });
  });

  it('rejects an over-long expression', () => {
    expect(parseSchedule(fd({ ...schedule, cronExpression: `0 0 7 * * ${'*'.repeat(100)}` }))).toEqual({
      ok: false,
      fieldErrors: { cronExpression: 'cronExpression' },
    });
  });

  it('rejects per-second and wrongly sized expressions before device-service sees them', () => {
    expect(parseSchedule(fd({ ...schedule, cronExpression: '*/5 * * * * *' }))).toEqual({
      ok: false,
      fieldErrors: { cronExpression: 'cronSeconds' },
    });
    expect(parseSchedule(fd({ ...schedule, cronExpression: '0 8 * * *' }))).toEqual({
      ok: false,
      fieldErrors: { cronExpression: 'cronFields' },
    });
  });
});

describe('parseActive', () => {
  it('reads the target state from the switch', () => {
    expect(parseActive(fd({ id: '4', active: 'true' }))).toEqual({ ok: true, value: { id: 4, active: true } });
    expect(parseActive(fd({ id: '4', active: 'false' }))).toEqual({ ok: true, value: { id: 4, active: false } });
  });

  it('rejects anything else', () => {
    expect(parseActive(fd({ id: '4', active: 'on' }))).toEqual({ ok: false, fieldErrors: { active: 'active' } });
    expect(parseActive(fd({ id: '-4', active: 'true' }))).toEqual({ ok: false, fieldErrors: { id: 'id' } });
  });
});

describe('parseScheduleId', () => {
  it('accepts positive integers only', () => {
    expect(parseScheduleId(fd({ id: '7' }))).toBe(7);
    expect(parseScheduleId(fd({ id: '7?x=1' }))).toBeNull();
    expect(parseScheduleId(fd({}))).toBeNull();
  });
});

describe('hasFieldError', () => {
  it('matches what FieldError renders: a local code or device-service details', () => {
    const local = { status: 'error', code: 'invalid', fieldErrors: { deviceName: 'deviceName' } } as const;
    const server = { status: 'error', code: 'invalid', details: { field: 'must not be blank' } } as const;
    expect(hasFieldError(local, 'deviceName')).toBe(true);
    expect(hasFieldError(local, 'field')).toBe(false);
    expect(hasFieldError(server, 'field')).toBe(true);
    expect(hasFieldError(server, 'deviceName')).toBe(false);
    expect(hasFieldError({ status: 'idle' }, 'field')).toBe(false);
  });
});
