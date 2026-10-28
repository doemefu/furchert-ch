import { describe, expect, it } from 'vitest';
import { SERVICE_HEALTH_EXCLUDE } from '@/data/service-health';
import type { PromSample, PromSeries } from './prometheus';
import {
  DAYS_SHOWN,
  HOURS_SHOWN,
  availabilityPermille,
  buildHourGrid,
  buildServiceHealthReport,
  classifyBucket,
  formatAvailability,
  formatUsage,
  zurichDateKey,
  type HourGrid,
  type ServiceHealthInputs,
} from './serviceHealth';

const H = 3_600_000;
const ms = (iso: string) => Date.parse(iso);

// Fixture grid of contract §4.2: 09:45 CET on 2026-10-28.
const NOW = ms('2026-10-28T08:45:00Z');
const GRID = buildHourGrid(NOW);

function hoursOfDay(grid: HourGrid, date: string): number[] {
  return grid.hourStartsMs.filter((h) => zurichDateKey(h) === date);
}

function inv(namespace: string, workload: string, kind = 'Deployment', desired = 1): PromSample {
  return { metric: { namespace, workload, kind }, value: desired };
}

// A range point at T covers (T-1h, T], so the point for hour start h is at h + 1h.
function points(values: Map<number, number> | Array<[number, number]>): PromSeries['points'] {
  return [...values].map(([hourStartMs, v]) => ({ tMs: hourStartMs + H, v }));
}

function avail(
  namespace: string,
  workload: string,
  values: Map<number, number> | Array<[number, number]>,
  kind = 'Deployment',
): PromSeries {
  return { metric: { namespace, workload, kind }, points: points(values) };
}

function restarts(namespace: string, workload: string, values: Map<number, number> | Array<[number, number]>): PromSeries {
  return { metric: { namespace, workload }, points: points(values) };
}

function usage(namespace: string, workload: string, container: string, basis: string, value: number): PromSample {
  return { metric: { namespace, workload, container, basis, pod: `${workload}-abc12345-xyz12` }, value };
}

function everyHour(grid: HourGrid, v: number): Array<[number, number]> {
  return grid.hourStartsMs.map((h) => [h, v]);
}

function inputs(overrides: Partial<ServiceHealthInputs> = {}): ServiceHealthInputs {
  return {
    grid: GRID,
    inventory: [inv('apps', 'auth-service')],
    availability: [],
    restarts: [],
    cpu: [],
    mem: [],
    exclude: [],
    ...overrides,
  };
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const mean = (xs: number[]) => (xs.length === 0 ? null : sum(xs) / xs.length);

describe('zurichDateKey', () => {
  it('S1 maps instants to Europe/Zurich dates across DST', () => {
    expect(zurichDateKey(ms('2026-10-13T22:00:00Z'))).toBe('2026-10-14');
    expect(zurichDateKey(ms('2026-10-24T22:30:00Z'))).toBe('2026-10-25');
    expect(zurichDateKey(ms('2026-10-25T22:59:59Z'))).toBe('2026-10-25');
    expect(zurichDateKey(ms('2026-10-25T23:00:00Z'))).toBe('2026-10-26');
  });
});

describe('buildHourGrid', () => {
  it('S2 builds 13 full Zurich days plus today, aligned to full hours', () => {
    expect(GRID.nowMs).toBe(NOW);
    expect(GRID.dayKeys).toHaveLength(14);
    expect(GRID.dayKeys[0]).toBe('2026-10-15');
    expect(GRID.dayKeys[13]).toBe('2026-10-28');
    expect(GRID.hourStartsMs[0]).toBe(ms('2026-10-14T22:00:00Z'));
    expect(GRID.hourStartsMs[GRID.hourStartsMs.length - 1]).toBe(ms('2026-10-28T08:00:00Z'));
    expect(GRID.hourStartsMs).toHaveLength(323);
    expect(GRID.range).toEqual({
      startSec: ms('2026-10-14T23:00:00Z') / 1000,
      endSec: ms('2026-10-28T09:00:00Z') / 1000,
      stepSec: 3600,
    });
    expect(buildServiceHealthReport(inputs()).window.hours).toBe(323);
  });

  it('S3 counts DST day lengths in the fall-back grid', () => {
    expect(hoursOfDay(GRID, '2026-10-25')).toHaveLength(25);
    expect(hoursOfDay(GRID, '2026-10-24')).toHaveLength(24);
    expect(hoursOfDay(GRID, '2026-10-28')).toHaveLength(10);
  });

  it('S4 gives the spring-forward day 23 hours', () => {
    const grid = buildHourGrid(ms('2027-03-29T10:00:00Z'));
    expect(hoursOfDay(grid, '2027-03-28')).toHaveLength(23);
  });

  it('S5 handles now exactly on the hour', () => {
    const grid = buildHourGrid(ms('2026-10-28T08:00:00Z'));
    expect(grid.hourStartsMs[grid.hourStartsMs.length - 1]).toBe(ms('2026-10-28T08:00:00Z'));
    expect(grid.range.endSec).toBe(ms('2026-10-28T09:00:00Z') / 1000);
  });
});

describe('classifyBucket', () => {
  it('S6 applies the permille rule', () => {
    expect(classifyBucket(1, 0)).toBe('green');
    expect(classifyBucket(1, null)).toBe('green');
    expect(classifyBucket(1, 1)).toBe('amber');
    expect(classifyBucket(0.9999, 0)).toBe('amber');
    expect(classifyBucket(0.99, 0)).toBe('amber');
    expect(classifyBucket(0.9899999999995, 0)).toBe('amber');
    expect(classifyBucket(0.98999999999, 0)).toBe('red');
    expect(classifyBucket(0.98999, 0)).toBe('red');
    expect(classifyBucket(0.5, 3)).toBe('red');
    expect(classifyBucket(null, 0)).toBe('nodata');
    expect(classifyBucket(null, null)).toBe('nodata');
  });

  it('S6b treats a non-finite availability as nodata, never green', () => {
    expect(classifyBucket(Number.NaN, 0)).toBe('nodata');
    expect(classifyBucket(Number.NaN, null)).toBe('nodata');
    expect(classifyBucket(Number.POSITIVE_INFINITY, 0)).toBe('nodata');
    expect(classifyBucket(Number.NEGATIVE_INFINITY, 0)).toBe('nodata');
  });
});

describe('formatting', () => {
  it('S7 floors availability to permille and never shows 100 below 1', () => {
    expect(availabilityPermille(1)).toBe(1000);
    expect(availabilityPermille(0.99996)).toBe(999);
    expect(availabilityPermille(0.98996)).toBe(989);
    expect(formatAvailability(1, 'en-GB')).toBe('100%');
    expect(formatAvailability(0.99996, 'en-GB')).toBe('99.9%');
    expect(formatAvailability(0.98996, 'en-GB')).toBe('98.9%');
    expect(formatAvailability(0.99, 'en-GB')).toBe('99.0%');
    expect(formatAvailability(0, 'en-GB')).toBe('0.0%');

    const de = formatAvailability(0.99996, 'de-CH');
    expect(de).toBe(
      new Intl.NumberFormat('de-CH', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(
        0.999,
      ),
    );
    expect(de).not.toMatch(/100/);
  });

  it('S8 formats unclamped usage ratios as whole percent', () => {
    expect(formatUsage(0.564, 'en-GB')).toBe('56%');
    expect(formatUsage(1.3, 'en-GB')).toBe('130%');
    expect(formatUsage(0.564, 'de-CH')).toBe(
      new Intl.NumberFormat('de-CH', { style: 'percent', maximumFractionDigits: 0 }).format(0.564),
    );
  });
});

describe('buildServiceHealthReport', () => {
  it('S9 reports an all-healthy workload as green everywhere', () => {
    const report = buildServiceHealthReport(
      inputs({
        availability: [avail('apps', 'auth-service', everyHour(GRID, 1))],
        restarts: [restarts('apps', 'auth-service', everyHour(GRID, 0))],
      }),
    );
    const [svc] = report.services;
    expect(svc.daily).toHaveLength(14);
    expect(svc.daily.every((d) => d.status === 'green')).toBe(true);
    expect(svc.hourly).toHaveLength(24);
    expect(svc.hourly.every((h) => h.status === 'green')).toBe(true);
    expect(svc.availability24h).toBe(1);
    expect(svc.availability14d).toBe(1);
    expect(svc.restarts24h).toBe(0);
    expect(svc.restarts14d).toBe(0);
  });

  it('S10 turns a 2-minute dip into a red hour but an amber day', () => {
    // A grid whose last 24 h cover the afternoon of 2026-10-20, so the dip hour
    // is visible in `hourly` while 2026-10-20 is a full (past) day.
    const grid = buildHourGrid(ms('2026-10-21T05:30:00Z'));
    const dipHour = hoursOfDay(grid, '2026-10-20')[14];
    const values = new Map(everyHour(grid, 1));
    values.set(dipHour, 0.9667);
    const report = buildServiceHealthReport(
      inputs({ grid, availability: [avail('apps', 'auth-service', values)] }),
    );
    const [svc] = report.services;

    for (const hour of svc.hourly) {
      expect(hour.status).toBe(hour.startMs === dipHour ? 'red' : 'green');
    }
    expect(svc.hourly.some((h) => h.startMs === dipHour)).toBe(true);
    for (const day of svc.daily) {
      expect(day.status).toBe(day.date === '2026-10-20' ? 'amber' : 'green');
    }
    expect(svc.availability14d).toBeLessThan(1);
  });

  it('S11 shows a mid-window workload as nodata before creation', () => {
    const last10 = GRID.hourStartsMs.slice(-10);
    const values: Array<[number, number]> = last10.map((h, i) => [h, i === 3 ? 0.5 : 1]);
    const report = buildServiceHealthReport(inputs({ availability: [avail('apps', 'auth-service', values)] }));
    const [svc] = report.services;

    for (const day of svc.daily.slice(0, -1)) {
      expect(day.status).toBe('nodata');
      expect(day.hoursWithData).toBe(0);
      expect(day.availability).toBeNull();
    }
    const today = svc.daily[svc.daily.length - 1];
    expect(today.hoursExpected).toBe(10);
    expect(today.hoursWithData).toBe(10);
    expect(svc.availability14d).toBeCloseTo(9.5 / 10, 12);
    expect(svc.hoursWithData14d).toBe(10);
  });

  it('S12 rounds restarts per hour before summing', () => {
    const day = hoursOfDay(GRID, '2026-10-20');
    const raw: Array<[number, number]> = [
      [day[0], 1.0084],
      [day[1], 2.0002],
      [day[2], 0.0],
      [day[3], 0.4],
    ];
    const lastHours = GRID.hourStartsMs.slice(-4);
    const recent: Array<[number, number]> = lastHours.map((h, i) => [h, raw[i][1]]);
    const report = buildServiceHealthReport(
      inputs({ restarts: [restarts('apps', 'auth-service', [...raw, ...recent])] }),
    );
    const [svc] = report.services;

    expect(svc.hourly.slice(-4).map((h) => h.restarts)).toEqual([1, 2, 0, 0]);
    expect(svc.daily.find((d) => d.date === '2026-10-20')?.restarts).toBe(3);
    expect(svc.restarts24h).toBe(3);
    expect(svc.restarts14d).toBe(6);
  });

  it('S13 leaves restarts null when the restarts group failed', () => {
    const report = buildServiceHealthReport(
      inputs({ availability: [avail('apps', 'auth-service', everyHour(GRID, 1))], restarts: null }),
    );
    const [svc] = report.services;

    expect(svc.hourly.every((h) => h.restarts === null)).toBe(true);
    expect(svc.daily.every((d) => d.restarts === null)).toBe(true);
    expect(svc.restarts24h).toBeNull();
    expect(svc.restarts14d).toBeNull();
    expect(svc.daily.every((d) => d.status === 'green')).toBe(true);
    expect(report.available).toEqual({ availability: true, restarts: false, cpu: true, mem: true });
  });

  it('S14 shows nodata everywhere when the availability group failed', () => {
    const report = buildServiceHealthReport(
      inputs({
        availability: null,
        restarts: [restarts('apps', 'auth-service', everyHour(GRID, 1))],
        cpu: [usage('apps', 'auth-service', 'app', 'limit', 0.5)],
      }),
    );
    const [svc] = report.services;

    expect(svc.daily.every((d) => d.status === 'nodata' && d.availability === null)).toBe(true);
    expect(svc.hourly.every((h) => h.status === 'nodata' && h.availability === null)).toBe(true);
    expect(svc.availability24h).toBeNull();
    expect(svc.availability14d).toBeNull();
    expect(report.available.availability).toBe(false);
    expect(svc.cpu).toEqual({ ratio: 0.5, basis: 'limit', container: 'app' });
  });

  it('S15 keeps a workload scaled to zero', () => {
    const report = buildServiceHealthReport(inputs({ inventory: [inv('apps', 'club-mcp', 'Deployment', 0)] }));
    expect(report.services).toHaveLength(1);
    expect(report.services[0].desiredReplicas).toBe(0);
  });

  it('S16 applies the exact-match exclude list', () => {
    const report = buildServiceHealthReport(
      inputs({
        inventory: [
          inv('apps', 'mosquitto-exporter'),
          inv('homeassistant', 'mosquitto-exporter'),
          inv('apps', 'mosquitto', 'StatefulSet'),
        ],
        exclude: SERVICE_HEALTH_EXCLUDE,
      }),
    );
    expect(report.services.map((s) => `${s.namespace}/${s.name}`)).toEqual([
      'apps/mosquitto',
      'homeassistant/mosquitto-exporter',
    ]);
  });

  it('S17 sorts by name, then namespace', () => {
    const report = buildServiceHealthReport(
      inputs({
        inventory: [inv('homeassistant', 'b'), inv('apps', 'c'), inv('apps', 'b'), inv('apps', 'a')],
      }),
    );
    expect(report.services.map((s) => `${s.namespace}/${s.name}`)).toEqual([
      'apps/a',
      'apps/b',
      'homeassistant/b',
      'apps/c',
    ]);
  });

  it('S18 ignores points outside the grid and rows not in the inventory', () => {
    const first = GRID.hourStartsMs[0];
    const last = GRID.hourStartsMs[GRID.hourStartsMs.length - 1];
    const outside: Array<[number, number]> = [
      [first - H, 0],
      [last + H, 0],
    ];
    const report = buildServiceHealthReport(
      inputs({
        availability: [avail('apps', 'auth-service', outside), avail('apps', 'ghost', everyHour(GRID, 1))],
        restarts: [restarts('apps', 'auth-service', outside), restarts('apps', 'ghost', everyHour(GRID, 5))],
        cpu: [usage('apps', 'ghost', 'app', 'limit', 0.5)],
      }),
    );
    expect(report.services.map((s) => s.name)).toEqual(['auth-service']);
    const [svc] = report.services;
    expect(svc.availability14d).toBeNull();
    expect(svc.hoursWithData14d).toBe(0);
    expect(svc.restarts14d).toBe(0);
  });

  it('S19 clamps availability to [0, 1]', () => {
    const [a, b] = GRID.hourStartsMs.slice(-2);
    const report = buildServiceHealthReport(
      inputs({
        availability: [
          avail('apps', 'auth-service', [
            [a, 1.02],
            [b, -0.1],
          ]),
        ],
      }),
    );
    const hourly = report.services[0].hourly;
    expect(hourly[22].availability).toBe(1);
    expect(hourly[23].availability).toBe(0);
  });

  it('S20 maps CPU/MEM topk samples and skips malformed ones', () => {
    const report = buildServiceHealthReport(
      inputs({
        inventory: [inv('apps', 'a'), inv('apps', 'b'), inv('apps', 'c'), inv('apps', 'd')],
        cpu: [
          usage('apps', 'a', 'app', 'limit', 0.56),
          usage('apps', 'b', 'app', 'bogus', 0.2),
          usage('apps', 'c', '', 'limit', 0.3),
        ],
        mem: [usage('apps', 'a', 'sidecar', 'request', 1.3)],
      }),
    );
    const byName = Object.fromEntries(report.services.map((s) => [s.name, s]));
    expect(byName.a.cpu).toEqual({ ratio: 0.56, basis: 'limit', container: 'app' });
    expect(byName.a.mem).toEqual({ ratio: 1.3, basis: 'request', container: 'sidecar' });
    expect(byName.b.cpu).toBeNull();
    expect(byName.c.cpu).toBeNull();
    expect(byName.d.cpu).toBeNull();
    expect(byName.d.mem).toBeNull();
  });

  it('S21 flags only the last hour as ongoing and only the last day as today', () => {
    const [svc] = buildServiceHealthReport(inputs()).services;
    expect(svc.hourly.map((h) => h.ongoing)).toEqual([...Array(23).fill(false), true]);
    expect(svc.daily.map((d) => d.isToday)).toEqual([...Array(13).fill(false), true]);
    expect(svc.hourly[23].startMs).toBe(ms('2026-10-28T08:00:00Z'));
    expect(svc.daily[13].date).toBe('2026-10-28');
    expect(svc.daily[13].startMs).toBe(ms('2026-10-27T23:00:00Z'));
  });

  it('S22 always returns DAYS_SHOWN daily and HOURS_SHOWN hourly buckets', () => {
    for (const groups of [
      { availability: [], restarts: [] },
      { availability: null, restarts: null, cpu: null, mem: null },
    ]) {
      const [svc] = buildServiceHealthReport(inputs(groups)).services;
      expect(svc.daily).toHaveLength(DAYS_SHOWN);
      expect(svc.hourly).toHaveLength(HOURS_SHOWN);
      expect(svc.daily).toHaveLength(14);
      expect(svc.hourly).toHaveLength(24);
    }
  });

  // Mixed fixture: gaps (every 7th hour missing, plus the first 30 hours), a dip
  // on 2026-10-20 and restarts spread over several days incl. the last 24 h.
  function mixedFixture() {
    const availValues = new Map<number, number>();
    const restartValues = new Map<number, number>();
    GRID.hourStartsMs.forEach((h, i) => {
      if (i >= 30 && i % 7 !== 0) availValues.set(h, 1);
      if (i % 41 === 0) restartValues.set(h, 1.2);
      if (i % 53 === 0) restartValues.set(h, 0.4);
    });
    const dayDip = hoursOfDay(GRID, '2026-10-20');
    availValues.set(dayDip[2], 0.9667);
    availValues.set(dayDip[3], 0.5);
    const recent = GRID.hourStartsMs.slice(-24);
    availValues.set(recent[4], 0.98);
    restartValues.set(recent[5], 2.0002);
    return { availValues, restartValues };
  }

  it('S23 keeps aggregates consistent with an independent recomputation', () => {
    const { availValues, restartValues } = mixedFixture();
    const report = buildServiceHealthReport(
      inputs({
        availability: [avail('apps', 'auth-service', availValues)],
        restarts: [restarts('apps', 'auth-service', restartValues)],
      }),
    );
    const [svc] = report.services;
    const rounded = (h: number) => Math.round(Math.max(0, restartValues.get(h) ?? 0));
    const present = (hs: number[]) => hs.filter((h) => availValues.has(h)).map((h) => availValues.get(h)!);

    const last24 = GRID.hourStartsMs.slice(-24);
    expect(svc.hourly.map((h) => h.startMs)).toEqual(last24);
    expect(svc.availability24h).toBe(mean(present(last24)));
    expect(svc.availability14d).toBe(mean(present(GRID.hourStartsMs)));
    expect(svc.hoursWithData14d).toBe(present(GRID.hourStartsMs).length);
    expect(svc.restarts24h).toBe(sum(last24.map(rounded)));
    expect(svc.restarts14d).toBe(sum(GRID.hourStartsMs.map(rounded)));
    expect(svc.restarts24h).toBeGreaterThan(0);

    svc.daily.forEach((day, i) => {
      const hs = hoursOfDay(GRID, GRID.dayKeys[i]);
      expect(day.date).toBe(GRID.dayKeys[i]);
      expect(day.hoursExpected).toBe(hs.length);
      expect(day.hoursWithData).toBe(present(hs).length);
      expect(day.hoursWithData).toBeLessThanOrEqual(day.hoursExpected);
      expect(day.availability).toBe(mean(present(hs)));
      expect(day.restarts).toBe(sum(hs.map(rounded)));
    });
    expect(report.window).toEqual({
      startMs: GRID.hourStartsMs[0],
      endMs: NOW,
      days: DAYS_SHOWN,
      hours: GRID.hourStartsMs.length,
      timeZone: 'Europe/Zurich',
    });
    expect(report.generatedAtMs).toBe(NOW);
  });

  it('S24 classifies every bucket from its own values', () => {
    const { availValues, restartValues } = mixedFixture();
    const report = buildServiceHealthReport(
      inputs({
        availability: [avail('apps', 'auth-service', availValues)],
        restarts: [restarts('apps', 'auth-service', restartValues)],
      }),
    );
    const [svc] = report.services;
    for (const h of svc.hourly) expect(h.status).toBe(classifyBucket(h.availability, h.restarts));
    for (const d of svc.daily) expect(d.status).toBe(classifyBucket(d.availability, d.restarts));

    // A day with one red hour but a daily mean >= 0.99 is amber, not red.
    const oneDip = new Map(everyHour(GRID, 1));
    oneDip.set(hoursOfDay(GRID, '2026-10-22')[7], 0.9667);
    const dipDay = buildServiceHealthReport(
      inputs({ availability: [avail('apps', 'auth-service', oneDip)] }),
    ).services[0].daily.find((d) => d.date === '2026-10-22');
    expect(dipDay?.status).toBe('amber');

    // Restarts from a healthy group but no availability data: nodata.
    const noAvail = buildServiceHealthReport(
      inputs({ restarts: [restarts('apps', 'auth-service', [[hoursOfDay(GRID, '2026-10-16')[0], 2]])] }),
    ).services[0].daily.find((d) => d.date === '2026-10-16');
    expect(noAvail?.restarts).toBe(2);
    expect(noAvail?.availability).toBeNull();
    expect(noAvail?.status).toBe('nodata');
  });

  it('S25 colours a low-availability day red and a restart-only day amber', () => {
    const values = new Map(everyHour(GRID, 1));
    for (const h of hoursOfDay(GRID, '2026-10-22').slice(0, 12)) values.set(h, 0.5);
    const restartHour = hoursOfDay(GRID, '2026-10-23')[9];
    // A second restart inside the last 24 h pins the hour-level amber, since
    // only those hours are exposed in `hourly`.
    const recentRestartHour = GRID.hourStartsMs[GRID.hourStartsMs.length - 3];
    const report = buildServiceHealthReport(
      inputs({
        availability: [avail('apps', 'auth-service', values)],
        restarts: [
          restarts('apps', 'auth-service', [
            [restartHour, 1],
            [recentRestartHour, 1],
          ]),
        ],
      }),
    );
    const [svc] = report.services;

    for (const day of svc.daily.filter((d) => !d.isToday)) {
      const expected = day.date === '2026-10-22' ? 'red' : day.date === '2026-10-23' ? 'amber' : 'green';
      expect(day.status).toBe(expected);
    }
    expect(svc.daily.find((d) => d.date === '2026-10-23')?.availability).toBe(1);
    expect(svc.daily.find((d) => d.date === '2026-10-23')?.restarts).toBe(1);
    expect(classifyBucket(1, 1)).toBe('amber');
    for (const hour of svc.hourly) {
      expect(hour.status).toBe(hour.startMs === recentRestartHour ? 'amber' : 'green');
    }
  });

  it('S26 skips inventory rows with an unknown kind or no workload', () => {
    const report = buildServiceHealthReport(
      inputs({
        inventory: [
          { metric: { namespace: 'apps', workload: 'node-agent', kind: 'DaemonSet' }, value: 1 },
          { metric: { namespace: 'apps', kind: 'Deployment' }, value: 1 },
          { metric: { namespace: 'apps', workload: '', kind: 'Deployment' }, value: 1 },
          { metric: { workload: 'no-namespace', kind: 'Deployment' }, value: 1 },
        ],
      }),
    );
    expect(report.services).toEqual([]);
  });

  it('S27 never lets missing hours turn a day red or amber', () => {
    const day = hoursOfDay(GRID, '2026-10-21');
    const report = buildServiceHealthReport(
      inputs({
        availability: [avail('apps', 'auth-service', day.slice(5, 8).map((h) => [h, 1]))],
        restarts: [restarts('apps', 'auth-service', [[day[5], 0]])],
      }),
    );
    const daily = report.services[0].daily.find((d) => d.date === '2026-10-21');
    expect(daily?.status).toBe('green');
    expect(daily?.hoursWithData).toBe(3);
    expect(daily?.hoursExpected).toBe(24);
    expect(daily?.availability).toBe(1);
    expect(daily?.restarts).toBe(0);
  });

  it('S28 pins the F10 keying limitation', () => {
    const last = GRID.hourStartsMs[GRID.hourStartsMs.length - 1];
    const report = buildServiceHealthReport(
      inputs({
        inventory: [inv('apps', 'redis', 'Deployment'), inv('apps', 'redis', 'StatefulSet')],
        availability: [avail('apps', 'redis', everyHour(GRID, 1), 'StatefulSet')],
        restarts: [restarts('apps', 'redis', [[last, 1]])],
      }),
    );
    const deployment = report.services.find((s) => s.kind === 'Deployment');
    const statefulSet = report.services.find((s) => s.kind === 'StatefulSet');

    // Restarts carry no kind, so both rows get the same values (documented limitation).
    expect(deployment?.restarts24h).toBe(1);
    expect(statefulSet?.restarts24h).toBe(1);
    // Availability carries the kind and matches exactly.
    expect(deployment?.daily.every((d) => d.status === 'nodata')).toBe(true);
    expect(deployment?.availability14d).toBeNull();
    expect(statefulSet?.daily.filter((d) => !d.isToday).every((d) => d.status === 'green')).toBe(true);
    expect(statefulSet?.availability14d).toBe(1);
  });

  it('S29 handles duplicate points, restart rounding and duplicate usage rows', () => {
    const [a, b] = GRID.hourStartsMs.slice(-2);
    const sameHourTwice: PromSeries = {
      metric: { namespace: 'apps', workload: 'auth-service', kind: 'Deployment' },
      points: [
        { tMs: b + H, v: 0.5 },
        { tMs: b + H, v: 1 },
      ],
    };
    const report = buildServiceHealthReport(
      inputs({
        availability: [sameHourTwice],
        restarts: [
          restarts('apps', 'auth-service', [
            [a, -0.4],
            [b, 0.5],
          ]),
        ],
        cpu: [usage('apps', 'auth-service', 'a', 'limit', 0.2), usage('apps', 'auth-service', 'b', 'limit', 0.9)],
        mem: [usage('apps', 'auth-service', 'b', 'limit', 0.9), usage('apps', 'auth-service', 'a', 'limit', 0.2)],
      }),
    );
    const [svc] = report.services;
    expect(svc.hourly[23].availability).toBe(1);
    expect(svc.hourly.slice(-2).map((h) => h.restarts)).toEqual([0, 1]);
    expect(svc.cpu).toEqual({ ratio: 0.9, basis: 'limit', container: 'b' });
    expect(svc.mem).toEqual({ ratio: 0.9, basis: 'limit', container: 'b' });

    const noCpu = buildServiceHealthReport(
      inputs({ cpu: null, mem: [usage('apps', 'auth-service', 'a', 'limit', 0.2)] }),
    );
    expect(noCpu.services[0].cpu).toBeNull();
    expect(noCpu.services[0].mem).not.toBeNull();
    expect(noCpu.available.cpu).toBe(false);
  });

  it('S30 shows only exactly 1 as 100 %', () => {
    const almostOne = 1 - 1e-13;
    expect(availabilityPermille(almostOne)).toBe(999);
    expect(formatAvailability(almostOne, 'en-GB')).toBe('99.9%');
    expect(classifyBucket(almostOne, 0)).toBe('amber');
  });

  it('S31 leaves restarts unknown for a workload without a restarts series', () => {
    const report = buildServiceHealthReport(
      inputs({
        inventory: [inv('apps', 'auth-service'), inv('apps', 'n8n')],
        availability: [avail('apps', 'auth-service', everyHour(GRID, 1)), avail('apps', 'n8n', everyHour(GRID, 1))],
        // Only n8n has a series, with a single point; its other hours count as 0.
        restarts: [restarts('apps', 'n8n', [[GRID.hourStartsMs[0], 0]])],
      }),
    );
    const byName = Object.fromEntries(report.services.map((s) => [s.name, s]));
    const missing = byName['auth-service'];

    expect(report.available.restarts).toBe(true);
    expect(missing.hourly.every((h) => h.restarts === null)).toBe(true);
    expect(missing.daily.every((d) => d.restarts === null)).toBe(true);
    expect(missing.restarts24h).toBeNull();
    expect(missing.restarts14d).toBeNull();
    // Colours then reflect availability only.
    expect(missing.daily.every((d) => d.status === 'green')).toBe(true);

    expect(byName.n8n.hourly.every((h) => h.restarts === 0)).toBe(true);
    expect(byName.n8n.daily.every((d) => d.restarts === 0)).toBe(true);
    expect(byName.n8n.restarts24h).toBe(0);
    expect(byName.n8n.restarts14d).toBe(0);
  });
});
