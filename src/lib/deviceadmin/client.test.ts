import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  controlDevice,
  createSchedule,
  deleteSchedule,
  getHealth,
  getSchedule,
  listDevices,
  listSchedules,
  parseDevice,
  parseSchedule,
  updateSchedule,
} from './client';

const DEVICE = {
  id: 1,
  name: 'terra1',
  mqttOnline: false,
  temperature: 24.5,
  humidity: 63.2,
  light: '1',
  nightLight: '0',
  rain: null,
  lastSeen: '2026-08-31T14:03:12.123456',
};

const SCHEDULE = {
  id: 5,
  deviceName: 'terra1',
  field: 'light',
  state: 1,
  payload: '{"LightState":1}',
  cronExpression: '0 0 7 * * *',
  active: true,
  nextRun: '2026-11-04T07:00:00Z',
};

const BODY = { deviceName: 'terra1', field: 'light' as const, state: 1 as const, cronExpression: '0 0 7 * * *', active: true };

function respond(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubEnv('DEVICE_SERVICE_URL', 'http://device.test/');
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('transport', () => {
  it('forwards the bearer token, skips caches and times out', async () => {
    fetchMock.mockResolvedValue(respond(200, [DEVICE]));
    expect(await listDevices('tok-123')).toEqual({ ok: true, data: [DEVICE] });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://device.test/devices');
    expect(init.method).toBe('GET');
    expect(init.headers.Authorization).toBe('Bearer tok-123');
    expect(init.cache).toBe('no-store');
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('posts a control command and accepts the empty 200', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    expect(await controlDevice('t', 3, { field: 'nightLight', state: 0 })).toEqual({ ok: true, data: null });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://device.test/devices/3/control');
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({ field: 'nightLight', state: 0 });
  });

  it('maps an empty-body 404 on control to not_found', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 404 }));
    expect(await controlDevice('t', 99, { field: 'light', state: 1 })).toEqual({ ok: false, kind: 'not_found' });
  });

  it('creates (201), replaces (200) and deletes (204) schedules', async () => {
    fetchMock.mockResolvedValueOnce(respond(201, SCHEDULE));
    expect(await createSchedule('t', BODY)).toEqual({ ok: true, data: SCHEDULE });
    expect(fetchMock.mock.calls[0][0]).toBe('http://device.test/schedules');
    expect(fetchMock.mock.calls[0][1].method).toBe('POST');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(BODY);

    fetchMock.mockResolvedValueOnce(respond(200, { ...SCHEDULE, active: false, nextRun: null }));
    expect(await updateSchedule('t', 5, { ...BODY, active: false })).toEqual({
      ok: true,
      data: { ...SCHEDULE, active: false, nextRun: null },
    });
    expect(fetchMock.mock.calls[1][0]).toBe('http://device.test/schedules/5');
    expect(fetchMock.mock.calls[1][1].method).toBe('PUT');

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    expect(await deleteSchedule('t', 5)).toEqual({ ok: true, data: null });
    expect(fetchMock.mock.calls[2][1].method).toBe('DELETE');
  });

  it('reads one schedule and the list', async () => {
    fetchMock.mockResolvedValueOnce(respond(200, SCHEDULE));
    expect(await getSchedule('t', 5)).toEqual({ ok: true, data: SCHEDULE });
    fetchMock.mockResolvedValueOnce(respond(200, [SCHEDULE]));
    expect(await listSchedules('t')).toEqual({ ok: true, data: [SCHEDULE] });
    expect(fetchMock.mock.calls[1][0]).toBe('http://device.test/schedules');
  });

  it('calls the public health endpoint without a token and accepts a DOWN body', async () => {
    fetchMock.mockResolvedValue(respond(503, { status: 'DOWN' }));
    expect(await getHealth()).toEqual({ ok: true, data: { status: 'DOWN' } });
    expect(fetchMock.mock.calls[0][0]).toBe('http://device.test/actuator/health');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('skips every call outside production without DEVICE_SERVICE_URL', async () => {
    vi.stubEnv('DEVICE_SERVICE_URL', '');
    vi.stubEnv('NODE_ENV', 'development');
    expect(await listDevices('t')).toEqual({ ok: false, kind: 'disabled' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('errors', () => {
  it('maps a validation 400 with a details array to message + per-field messages', async () => {
    fetchMock.mockResolvedValue(
      respond(400, {
        error: 'Validation failed',
        details: [
          'cronExpression: must be a valid Spring cron expression (6 fields) that fires in the future',
          'deviceName: must not be blank',
          'deviceName: must match [a-z0-9-]{3,32}',
          'no colon here',
        ],
      }),
    );
    expect(await createSchedule('t', BODY)).toEqual({
      ok: false,
      kind: 'bad_request',
      message: 'Validation failed',
      details: {
        cronExpression: 'must be a valid Spring cron expression (6 fields) that fires in the future',
        deviceName: 'must not be blank; must match [a-z0-9-]{3,32}',
        _: 'no colon here',
      },
    });
  });

  it('splits a detail on the first ": " only', async () => {
    fetchMock.mockResolvedValue(respond(400, { error: 'Validation failed', details: ['deviceName: unknown device: terra9'] }));
    const r = await createSchedule('t', BODY);
    expect(r.ok ? null : r.details).toEqual({ deviceName: 'unknown device: terra9' });
  });

  it('caps the number of details', async () => {
    fetchMock.mockResolvedValue(respond(400, { error: 'x', details: Array.from({ length: 50 }, (_, i) => `f${i}: m`) }));
    const r = await createSchedule('t', BODY);
    expect(Object.keys(r.ok ? {} : r.details ?? {})).toHaveLength(20);
  });

  it('keeps a 400 without details', async () => {
    fetchMock.mockResolvedValue(respond(400, { error: 'Malformed request body' }));
    expect(await updateSchedule('t', 5, BODY)).toEqual({ ok: false, kind: 'bad_request', message: 'Malformed request body' });
  });

  it.each([
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [404, 'not_found'],
    [500, 'unavailable'],
    [503, 'unavailable'],
    [418, 'unexpected'],
  ])('maps HTTP %i to %s', async (status, kind) => {
    fetchMock.mockResolvedValue(respond(status, { error: 'x' }));
    expect(await listSchedules('t')).toEqual({ ok: false, kind });
  });

  it('maps a network error to unavailable', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    expect(await listDevices('t')).toEqual({ ok: false, kind: 'unavailable' });
  });

  it('never logs the token or a body', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    fetchMock.mockResolvedValue(respond(400, { error: 'secret-ish detail', details: ['x: y'] }));
    await createSchedule('tok-secret', BODY);
    const logged = warn.mock.calls.flat().join(' ');
    expect(logged).not.toContain('tok-secret');
    expect(logged).not.toContain('secret-ish');
    expect(logged).toContain('[deviceadmin]');
  });

  it('rejects a body that is not the documented list', async () => {
    fetchMock.mockResolvedValue(respond(200, { devices: [] }));
    expect(await listDevices('t')).toEqual({ ok: false, kind: 'unexpected' });
  });
});

describe('shape guards', () => {
  it('accepts a device with every optional field null', () => {
    expect(
      parseDevice({ id: 2, name: 'terra2', mqttOnline: null, temperature: null, humidity: null, light: null, nightLight: null, rain: null, lastSeen: null }),
    ).toEqual({ id: 2, name: 'terra2', mqttOnline: null, temperature: null, humidity: null, light: null, nightLight: null, rain: null, lastSeen: null });
  });

  it('nulls fields of the wrong type instead of trusting them', () => {
    expect(parseDevice({ id: 2, name: 'terra2', mqttOnline: 'yes', temperature: '24', light: 1 })).toMatchObject({
      mqttOnline: null,
      temperature: null,
      light: null,
    });
  });

  it('requires a device id and name', () => {
    expect(parseDevice({ name: 'terra2' })).toBeNull();
    expect(parseDevice({ id: 2 })).toBeNull();
    expect(parseDevice({ id: 1.5, name: 'x' })).toBeNull();
  });

  it('accepts a legacy schedule row (null field, custom payload, 5-field cron)', () => {
    expect(
      parseSchedule({ id: 9, deviceName: null, field: null, state: null, payload: '{"foo":1}', cronExpression: '0 8 * * *', active: true, nextRun: null }),
    ).toEqual({ id: 9, deviceName: null, field: null, state: null, payload: '{"foo":1}', cronExpression: '0 8 * * *', active: true, nextRun: null });
  });

  it('requires a schedule id and a boolean active', () => {
    expect(parseSchedule({ ...SCHEDULE, id: '5' })).toBeNull();
    expect(parseSchedule({ ...SCHEDULE, active: 'true' })).toBeNull();
  });

  it('nulls a state other than 0/1', () => {
    expect(parseSchedule({ ...SCHEDULE, state: 7 })).toMatchObject({ state: null });
  });

  it('rejects a list with one malformed row', async () => {
    fetchMock.mockResolvedValue(respond(200, [SCHEDULE, { id: 'x' }]));
    expect(await listSchedules('t')).toEqual({ ok: false, kind: 'unexpected' });
  });
});
