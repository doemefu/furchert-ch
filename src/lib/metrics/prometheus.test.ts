import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryInstant, queryRange } from './prometheus';

function respond(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function matrix(result: unknown[]) {
  return { status: 'success', data: { resultType: 'matrix', result } };
}

const RANGE = { startSec: 100, endSec: 7300, stepSec: 3600 };
const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubEnv('PROMETHEUS_URL', 'http://prom.test/');
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('queryRange', () => {
  it('P1 posts a form-encoded range query', async () => {
    fetchMock.mockResolvedValue(respond(200, matrix([])));
    await queryRange('up', RANGE);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://prom.test/api/v1/query_range');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/x-www-form-urlencoded' });
    expect(init.cache).toBe('no-store');
    const body = init.body as URLSearchParams;
    expect(body.get('query')).toBe('up');
    expect(body.get('start')).toBe('100');
    expect(body.get('end')).toBe('7300');
    expect(body.get('step')).toBe('3600');
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('P2 uses a 5000 ms default timeout, overridable', async () => {
    const spy = vi.spyOn(AbortSignal, 'timeout');
    fetchMock.mockImplementation(async () => respond(200, matrix([])));
    await queryRange('up', RANGE);
    expect(spy).toHaveBeenLastCalledWith(5000);
    await queryRange('up', RANGE, 1234);
    expect(spy).toHaveBeenLastCalledWith(1234);
  });

  it('P3 parses a matrix into ms-timestamped points', async () => {
    const values = [
      [3600, '1'],
      [7200, '0.5'],
    ];
    fetchMock.mockResolvedValue(
      respond(200, matrix([{ metric: { a: 'x' }, values }, { metric: { a: 'y' }, values }])),
    );
    const out = await queryRange('up', RANGE);
    const points = [
      { tMs: 3_600_000, v: 1 },
      { tMs: 7_200_000, v: 0.5 },
    ];
    expect(out).toEqual([
      { metric: { a: 'x' }, points },
      { metric: { a: 'y' }, points },
    ]);
  });

  it('P4 drops non-finite and malformed points', async () => {
    fetchMock.mockResolvedValue(
      respond(
        200,
        matrix([
          {
            metric: {},
            values: [
              [1, 'NaN'],
              [2, '+Inf'],
              [3, '-Inf'],
              [4, 5],
              [5],
              [6, '2'],
            ],
          },
        ]),
      ),
    );
    const out = await queryRange('up', RANGE);
    expect(out).toEqual([{ metric: {}, points: [{ tMs: 6000, v: 2 }] }]);
  });

  it('P5 omits series with no valid points', async () => {
    fetchMock.mockResolvedValue(
      respond(
        200,
        matrix([
          { metric: { a: 'bad' }, values: [[1, 'NaN']] },
          { metric: { a: 'ok' }, values: [[1, '1']] },
        ]),
      ),
    );
    const out = await queryRange('up', RANGE);
    expect(out.map((s) => s.metric.a)).toEqual(['ok']);
  });

  it('P6 rejects on HTTP 500', async () => {
    fetchMock.mockResolvedValue(respond(500));
    await expect(queryRange('up', RANGE)).rejects.toThrow('HTTP 500');
  });

  it('P7 rejects on status error', async () => {
    fetchMock.mockResolvedValue(respond(200, { status: 'error' }));
    await expect(queryRange('up', RANGE)).rejects.toThrow();
  });

  it('P8 rejects on a vector result', async () => {
    fetchMock.mockResolvedValue(
      respond(200, { status: 'success', data: { resultType: 'vector', result: [] } }),
    );
    await expect(queryRange('up', RANGE)).rejects.toThrow('resultType=vector');
  });
});

describe('queryInstant (regression)', () => {
  it('P9 still parses a vector, rejects a matrix, and keeps its 2500 ms timeout', async () => {
    const spy = vi.spyOn(AbortSignal, 'timeout');
    fetchMock.mockImplementation(async () =>
      respond(200, {
        status: 'success',
        data: { resultType: 'vector', result: [{ metric: { a: 'x' }, value: [1, '3'] }] },
      }),
    );
    expect(await queryInstant('up')).toEqual([{ metric: { a: 'x' }, value: 3 }]);
    expect(spy).toHaveBeenLastCalledWith(2500);

    fetchMock.mockImplementation(async () => respond(200, matrix([])));
    await expect(queryInstant('up')).rejects.toThrow('resultType=matrix');
  });
});
