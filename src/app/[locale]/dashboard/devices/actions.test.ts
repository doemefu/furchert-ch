import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.fn();
const getAdminAccessToken = vi.fn();
const revalidatePath = vi.fn();
const client = {
  controlDevice: vi.fn(),
  getSchedule: vi.fn(),
  createSchedule: vi.fn(),
  updateSchedule: vi.fn(),
  deleteSchedule: vi.fn(),
};

vi.mock('@/auth', () => ({ auth }));
vi.mock('next/cache', () => ({ revalidatePath }));
vi.mock('@/lib/authadmin/accessToken', () => ({ getAdminAccessToken }));
vi.mock('@/lib/deviceadmin/client', () => client);

const actions = await import('./actions');
const IDLE = { status: 'idle' } as const;
const PAGE = '/[locale]/dashboard/devices';

const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

const control = { id: '1', field: 'light', state: '1' };
const schedule = { deviceName: 'terra1', field: 'light', state: '1', cronExpression: '0 0 7 * * *', active: 'on' };
const STORED = {
  id: 5,
  deviceName: 'terra1',
  field: 'light',
  state: 1,
  payload: '{"LightState":1}',
  cronExpression: '0 0 7 * * *',
  active: true,
  nextRun: '2026-11-04T07:00:00Z',
};

// Every action with a valid input, for the gate tests.
const ALL: Array<[string, (s: typeof IDLE, f: FormData) => Promise<unknown>, Record<string, string>]> = [
  ['controlDeviceAction', actions.controlDeviceAction, control],
  ['saveScheduleAction', actions.saveScheduleAction, schedule],
  ['deleteScheduleAction', actions.deleteScheduleAction, { id: '5' }],
  ['setScheduleActiveAction', actions.setScheduleActiveAction, { id: '5', active: 'false' }],
];
const anyClientCall = () => Object.values(client).some((f) => f.mock.calls.length > 0);

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { role: 'ADMIN' } });
  getAdminAccessToken.mockResolvedValue({ ok: true, token: 'admin-token', subject: 'dominic' });
  client.getSchedule.mockResolvedValue({ ok: true, data: STORED });
  client.updateSchedule.mockResolvedValue({ ok: true, data: STORED });
});

describe('role gate (every action)', () => {
  it.each(ALL)('%s rejects a missing session', async (_n, action, input) => {
    auth.mockResolvedValue(null);
    expect(await action(IDLE, fd(input))).toEqual({ status: 'error', code: 'session' });
    expect(anyClientCall()).toBe(false);
  });

  it.each(ALL)('%s treats a throwing auth() as no session', async (_n, action, input) => {
    auth.mockRejectedValue(new Error('bad cookie'));
    expect(await action(IDLE, fd(input))).toEqual({ status: 'error', code: 'session' });
    expect(anyClientCall()).toBe(false);
  });

  it.each(ALL)('%s rejects a non-ADMIN session', async (_n, action, input) => {
    for (const user of [{ role: 'USER' }, {}, { role: 'admin' }]) {
      auth.mockResolvedValue({ user });
      expect(await action(IDLE, fd(input))).toEqual({ status: 'error', code: 'forbidden' });
    }
    expect(anyClientCall()).toBe(false);
  });

  it.each(ALL)('%s asks to sign in again without an access token', async (_n, action, input) => {
    getAdminAccessToken.mockResolvedValue({ ok: false, reason: 'expired' });
    expect(await action(IDLE, fd(input))).toEqual({ status: 'error', code: 'session' });
    expect(anyClientCall()).toBe(false);
  });

  it('checks the session before reporting validation errors', async () => {
    auth.mockResolvedValue(null);
    expect(await actions.controlDeviceAction(IDLE, fd({ ...control, field: 'heater' }))).toEqual({ status: 'error', code: 'session' });
  });
});

describe('controlDeviceAction', () => {
  it('validates before calling device-service', async () => {
    expect(await actions.controlDeviceAction(IDLE, fd({ ...control, id: '1/../../actuator' }))).toEqual({
      status: 'error',
      code: 'validation',
      fieldErrors: { id: 'id' },
    });
    expect(client.controlDevice).not.toHaveBeenCalled();
  });

  it('sends the command with the admin token and revalidates', async () => {
    client.controlDevice.mockResolvedValue({ ok: true, data: null });
    expect(await actions.controlDeviceAction(IDLE, fd(control))).toEqual({ status: 'ok', sent: { field: 'light', state: 1 } });
    expect(client.controlDevice).toHaveBeenCalledWith('admin-token', 1, { field: 'light', state: 1 });
    expect(revalidatePath).toHaveBeenCalledWith(PAGE, 'page');
  });

  it('maps device-service failures', async () => {
    client.controlDevice.mockResolvedValue({ ok: false, kind: 'not_found' });
    expect(await actions.controlDeviceAction(IDLE, fd(control))).toEqual({ status: 'error', code: 'notFound' });
    client.controlDevice.mockResolvedValue({ ok: false, kind: 'forbidden' });
    expect(await actions.controlDeviceAction(IDLE, fd(control))).toEqual({ status: 'error', code: 'forbidden' });
    client.controlDevice.mockResolvedValue({ ok: false, kind: 'unauthorized' });
    expect(await actions.controlDeviceAction(IDLE, fd(control))).toEqual({ status: 'error', code: 'session' });
    client.controlDevice.mockResolvedValue({ ok: false, kind: 'unavailable' });
    expect(await actions.controlDeviceAction(IDLE, fd(control))).toEqual({ status: 'error', code: 'unavailable' });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe('saveScheduleAction', () => {
  it('creates without an id and returns the API nextRun', async () => {
    client.createSchedule.mockResolvedValue({ ok: true, data: STORED });
    expect(await actions.saveScheduleAction(IDLE, fd(schedule))).toEqual({
      status: 'ok',
      saved: { id: 5, active: true, nextRun: '2026-11-04T07:00:00Z' },
    });
    expect(client.createSchedule).toHaveBeenCalledWith('admin-token', {
      deviceName: 'terra1',
      field: 'light',
      state: 1,
      cronExpression: '0 0 7 * * *',
      active: true,
    });
    expect(client.updateSchedule).not.toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith(PAGE, 'page');
  });

  it('replaces by id', async () => {
    const inactive = Object.fromEntries(Object.entries(schedule).filter(([k]) => k !== 'active'));
    await actions.saveScheduleAction(IDLE, fd({ ...inactive, id: '5' }));
    expect(client.updateSchedule).toHaveBeenCalledWith('admin-token', 5, {
      deviceName: 'terra1',
      field: 'light',
      state: 1,
      cronExpression: '0 0 7 * * *',
      active: false,
    });
    expect(client.createSchedule).not.toHaveBeenCalled();
  });

  it('blocks per-second expressions locally', async () => {
    expect(await actions.saveScheduleAction(IDLE, fd({ ...schedule, cronExpression: '* * * * * *' }))).toEqual({
      status: 'error',
      code: 'validation',
      fieldErrors: { cronExpression: 'cronSeconds' },
    });
    expect(client.createSchedule).not.toHaveBeenCalled();
  });

  it('passes device-service validation messages through for inline display', async () => {
    client.createSchedule.mockResolvedValue({
      ok: false,
      kind: 'bad_request',
      message: 'Validation failed',
      details: { deviceName: 'unknown device: terra9' },
    });
    expect(await actions.saveScheduleAction(IDLE, fd(schedule))).toEqual({
      status: 'error',
      code: 'validation',
      message: 'Validation failed',
      details: { deviceName: 'unknown device: terra9' },
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('reports a schedule deleted meanwhile', async () => {
    client.updateSchedule.mockResolvedValue({ ok: false, kind: 'not_found' });
    expect(await actions.saveScheduleAction(IDLE, fd({ ...schedule, id: '5' }))).toEqual({ status: 'error', code: 'notFound' });
  });
});

describe('deleteScheduleAction', () => {
  it('rejects a bad id', async () => {
    expect(await actions.deleteScheduleAction(IDLE, fd({ id: 'abc' }))).toEqual({
      status: 'error',
      code: 'validation',
      fieldErrors: { id: 'id' },
    });
    expect(client.deleteSchedule).not.toHaveBeenCalled();
  });

  it('deletes and revalidates', async () => {
    client.deleteSchedule.mockResolvedValue({ ok: true, data: null });
    expect(await actions.deleteScheduleAction(IDLE, fd({ id: '5' }))).toEqual({ status: 'ok', deleted: 5 });
    expect(client.deleteSchedule).toHaveBeenCalledWith('admin-token', 5);
    expect(revalidatePath).toHaveBeenCalledWith(PAGE, 'page');
  });
});

describe('setScheduleActiveAction', () => {
  it('re-reads the schedule and replaces it with only `active` changed', async () => {
    client.updateSchedule.mockResolvedValue({ ok: true, data: { ...STORED, active: false, nextRun: null } });
    expect(await actions.setScheduleActiveAction(IDLE, fd({ id: '5', active: 'false' }))).toEqual({
      status: 'ok',
      saved: { id: 5, active: false, nextRun: null },
    });
    expect(client.getSchedule).toHaveBeenCalledWith('admin-token', 5);
    expect(client.updateSchedule).toHaveBeenCalledWith('admin-token', 5, {
      deviceName: 'terra1',
      field: 'light',
      state: 1,
      cronExpression: '0 0 7 * * *',
      active: false,
    });
  });

  it.each([
    { state: null },
    { field: 'heater' },
    { field: null },
    { deviceName: null },
    { cronExpression: null },
  ])('refuses to rewrite a non-standard schedule (%o)', async (change) => {
    client.getSchedule.mockResolvedValue({ ok: true, data: { ...STORED, ...change } });
    expect(await actions.setScheduleActiveAction(IDLE, fd({ id: '5', active: 'false' }))).toEqual({ status: 'error', code: 'payload' });
    expect(client.updateSchedule).not.toHaveBeenCalled();
  });

  it('maps a failed read', async () => {
    client.getSchedule.mockResolvedValue({ ok: false, kind: 'not_found' });
    expect(await actions.setScheduleActiveAction(IDLE, fd({ id: '5', active: 'true' }))).toEqual({ status: 'error', code: 'notFound' });
    expect(client.updateSchedule).not.toHaveBeenCalled();
  });

  it('rejects a target state other than true/false', async () => {
    expect(await actions.setScheduleActiveAction(IDLE, fd({ id: '5', active: 'yes' }))).toEqual({
      status: 'error',
      code: 'validation',
      fieldErrors: { active: 'active' },
    });
    expect(client.getSchedule).not.toHaveBeenCalled();
  });
});

describe('no token leakage', () => {
  it('never returns the access token in any state', async () => {
    client.controlDevice.mockResolvedValue({ ok: true, data: null });
    client.createSchedule.mockResolvedValue({ ok: true, data: STORED });
    client.deleteSchedule.mockResolvedValue({ ok: true, data: null });
    const states = await Promise.all(ALL.map(([, action, input]) => action(IDLE, fd(input))));
    expect(JSON.stringify(states)).not.toContain('admin-token');
  });
});
