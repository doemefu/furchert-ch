// Pure service-health logic for the ADMIN-only `/dashboard/services` page
// (issue #47). Builds the DST-safe Europe/Zurich hour grid, buckets the
// Prometheus range/instant results into hours and days, classifies them and
// formats percentages. No fetch, no React, no next-intl: `services.ts` does
// the I/O and `ServicesShell` the rendering. Only types are imported from
// `./prometheus` (server-only), so nothing of it reaches this module at
// runtime.
import type { PromSample, PromSeries } from './prometheus';

export const SERVICE_HEALTH_TZ = 'Europe/Zurich';
export const DAYS_SHOWN = 14; // 13 full Zurich days + today (keeps the window inside the 14 d retention)
export const HOURS_SHOWN = 24;
export const STEP_SEC = 3600;

export type WorkloadKind = 'Deployment' | 'StatefulSet';
export type BucketStatus = 'green' | 'amber' | 'red' | 'nodata';
export type UsageBasis = 'limit' | 'request';
export type MetricGroup = 'availability' | 'restarts' | 'cpu' | 'mem';

// Every epoch-millisecond field carries an `Ms` suffix; `range` is in seconds.
export interface HourGrid {
  nowMs: number;
  /** Full UTC hours, oldest → newest; the last one contains `nowMs`. */
  hourStartsMs: number[];
  /** DAYS_SHOWN Zurich dates 'YYYY-MM-DD', oldest → newest; the last is today. */
  dayKeys: string[];
  range: { startSec: number; endSec: number; stepSec: typeof STEP_SEC };
}

export interface HourlyAvailability {
  startMs: number;
  /** [0,1]; null = no samples (did not exist, desired 0 all hour, or group failed). */
  availability: number | null;
  /** Integer ≥ 0; null = restarts group failed or no restarts series for this workload. */
  restarts: number | null;
  ongoing: boolean;
  status: BucketStatus;
}

export interface DailyAvailability {
  date: string;
  /** Zurich midnight (= first hour start of the day). */
  startMs: number;
  /** 23/24/25 for full days; elapsed hours incl. the ongoing one for today. */
  hoursExpected: number;
  hoursWithData: number;
  /** Mean of the non-null hourly values; null if hoursWithData = 0. */
  availability: number | null;
  /** Sum over ALL hours of the day, independent of hoursWithData; null if the restarts group failed or the workload has no restarts series. */
  restarts: number | null;
  isToday: boolean;
  /** Classified from the daily aggregate, not from the worst hour. */
  status: BucketStatus;
}

export interface ResourceUsage {
  /** usage / basis, ≥ 0, not clamped (CPU vs request can exceed 1). */
  ratio: number;
  basis: UsageBasis;
  /** Container with the highest ratio. */
  container: string;
}

export interface ServiceHealth {
  namespace: string;
  name: string;
  kind: WorkloadKind;
  desiredReplicas: number;
  cpu: ResourceUsage | null;
  mem: ResourceUsage | null;
  daily: DailyAvailability[];
  hourly: HourlyAvailability[];
  /** Hour-weighted means over the non-null hours of `hourly` / of all grid hours. */
  availability24h: number | null;
  availability14d: number | null;
  /** The matching expected count is `report.window.hours`. */
  hoursWithData14d: number;
  restarts24h: number | null;
  restarts14d: number | null;
}

export interface ServiceHealthReport {
  generatedAtMs: number;
  window: { startMs: number; endMs: number; days: number; hours: number; timeZone: string };
  /** Sorted by name, then namespace. */
  services: ServiceHealth[];
  /** true = that query group was fulfilled. */
  available: Record<MetricGroup, boolean>;
}

export interface ServiceHealthInputs {
  grid: HourGrid;
  inventory: PromSample[];
  /** null = that query group was rejected. */
  availability: PromSeries[] | null;
  restarts: PromSeries[] | null;
  cpu: PromSample[] | null;
  mem: PromSample[] | null;
  exclude: ReadonlyArray<{ namespace: string; name: string }>;
}

const HOUR_MS = 3_600_000;

// formatToParts keeps the key independent of locale-specific date patterns.
const zurichDateFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: SERVICE_HEALTH_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function zurichDateKey(ms: number): string {
  const parts = zurichDateFormat.formatToParts(ms);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

// Zurich offsets are whole hours, so every Zurich midnight is a full UTC hour:
// walking back hour by hour until a 15th date appears yields exactly
// DAYS_SHOWN days, with 23/25 hours on DST change days.
export function buildHourGrid(nowMs: number): HourGrid {
  const hourStartsMs: number[] = [];
  const dayKeys: string[] = [];
  let h = Math.floor(nowMs / HOUR_MS) * HOUR_MS;
  for (;;) {
    const key = zurichDateKey(h);
    if (dayKeys[0] !== key) {
      if (dayKeys.length === DAYS_SHOWN) break;
      dayKeys.unshift(key);
    }
    hourStartsMs.unshift(h);
    h -= HOUR_MS;
  }
  // A range point at T covers (T-1h, T], so the range runs one hour after the
  // hour starts; `end` lies in the future while the last hour is ongoing.
  return {
    nowMs,
    hourStartsMs,
    dayKeys,
    range: {
      startSec: hourStartsMs[0] / 1000 + STEP_SEC,
      endSec: hourStartsMs[hourStartsMs.length - 1] / 1000 + STEP_SEC,
      stepSec: STEP_SEC,
    },
  };
}

// Floor, never round up, so 99.96 % is shown as 99.9 % and not as 100 %.
// The epsilon absorbs float noise just below a permille boundary.
// Only exactly 1 is 100 % (e.g. 1 - 1e-13 is 99.9 %): the ratio of sums of
// integer replica counts is exactly 1 when nothing was missing.
export function availabilityPermille(availability: number): number {
  return availability >= 1 ? 1000 : Math.min(999, Math.floor(availability * 1000 + 1e-9));
}

// Uses the same permille as the display, so colour and shown percentage never
// disagree. With restarts unknown (null) the colour reflects availability only.
// A non-finite availability is treated like no data, never as green.
export function classifyBucket(availability: number | null, restarts: number | null): BucketStatus {
  if (availability === null || !Number.isFinite(availability)) return 'nodata';
  const permille = availabilityPermille(availability);
  if (permille < 990) return 'red';
  if (permille < 1000 || (restarts ?? 0) >= 1) return 'amber';
  return 'green';
}

// One formatter per (locale tag, variant): a page renders hundreds of values.
const percentFormats = new Map<string, Intl.NumberFormat>();
function percentFormat(localeTag: string, fractionDigits: 0 | 1): Intl.NumberFormat {
  const key = `${localeTag}|${fractionDigits}`;
  let fmt = percentFormats.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat(localeTag, {
      style: 'percent',
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    percentFormats.set(key, fmt);
  }
  return fmt;
}

export function formatAvailability(availability: number, localeTag: string): string {
  const permille = availabilityPermille(availability);
  if (permille === 1000) return percentFormat(localeTag, 0).format(1);
  return percentFormat(localeTag, 1).format(permille / 1000);
}

export function formatUsage(ratio: number, localeTag: string): string {
  return percentFormat(localeTag, 0).format(ratio);
}

type HourValues = Array<number | null>;

// Maps range points onto grid hour indices (point at T → hour start T - 1h).
// Points outside the grid are ignored; a later point for the same hour wins.
function bucketSeries(
  series: PromSeries[],
  hourIndex: Map<number, number>,
  keyOf: (metric: Record<string, string>) => string | null,
  toValue: (v: number) => number,
): Map<string, HourValues> {
  const byKey = new Map<string, HourValues>();
  for (const s of series) {
    const key = keyOf(s.metric);
    if (key === null) continue;
    let values = byKey.get(key);
    if (!values) {
      values = new Array<number | null>(hourIndex.size).fill(null);
      byKey.set(key, values);
    }
    for (const { tMs, v } of s.points) {
      const i = hourIndex.get(tMs - HOUR_MS);
      if (i !== undefined) values[i] = toValue(v);
    }
  }
  return byKey;
}

// topk already picks the highest container per workload; should a workload
// still appear twice, the higher ratio wins.
function usageByWorkload(samples: PromSample[]): Map<string, ResourceUsage> {
  const byKey = new Map<string, ResourceUsage>();
  for (const { metric, value } of samples) {
    const { namespace, workload, container, basis } = metric;
    if (!namespace || !workload || !container) continue;
    if (basis !== 'limit' && basis !== 'request') continue;
    const ratio = Math.max(0, value);
    const prev = byKey.get(`${namespace}/${workload}`);
    if (!prev || ratio > prev.ratio) byKey.set(`${namespace}/${workload}`, { ratio, basis, container });
  }
  return byKey;
}

function meanOf(values: HourValues): { mean: number | null; count: number } {
  let sum = 0;
  let count = 0;
  for (const v of values) {
    if (v !== null) {
      sum += v;
      count += 1;
    }
  }
  return { mean: count === 0 ? null : sum / count, count };
}

function sumOf(values: HourValues, known: boolean): number | null {
  if (!known) return null;
  return values.reduce<number>((acc, v) => acc + (v ?? 0), 0);
}

function isWorkloadKind(kind: string | undefined): kind is WorkloadKind {
  return kind === 'Deployment' || kind === 'StatefulSet';
}

export function buildServiceHealthReport(inputs: ServiceHealthInputs): ServiceHealthReport {
  const { grid } = inputs;
  const hourCount = grid.hourStartsMs.length;
  const hourIndex = new Map(grid.hourStartsMs.map((h, i) => [h, i] as const));
  const today = grid.dayKeys[grid.dayKeys.length - 1];

  // Hour indices per Zurich date, in grid order.
  const hoursByDay = new Map<string, number[]>(grid.dayKeys.map((d) => [d, []]));
  grid.hourStartsMs.forEach((h, i) => hoursByDay.get(zurichDateKey(h))?.push(i));

  // Inventory rows keyed by (namespace, kind, name); exclusion is exact-match.
  const excluded = new Set(inputs.exclude.map((e) => `${e.namespace}/${e.name}`));
  const inventory = new Map<string, { namespace: string; name: string; kind: WorkloadKind; desiredReplicas: number }>();
  for (const { metric, value } of inputs.inventory) {
    const { namespace, workload, kind } = metric;
    if (!namespace || !workload || !isWorkloadKind(kind)) continue;
    if (excluded.has(`${namespace}/${workload}`)) continue;
    inventory.set(`${namespace}/${kind}/${workload}`, {
      namespace,
      name: workload,
      kind,
      desiredReplicas: Math.max(0, Math.round(value)),
    });
  }

  // Availability carries `kind`; restarts/CPU/MEM come from pod names and are
  // matched by (namespace, name) only (F10).
  const availability = bucketSeries(
    inputs.availability ?? [],
    hourIndex,
    ({ namespace, workload, kind }) => (namespace && workload && kind ? `${namespace}/${kind}/${workload}` : null),
    (v) => Math.min(1, Math.max(0, v)),
  );
  // Rounded per hour, then summed, so every total equals the sum of its hours.
  const restarts = bucketSeries(
    inputs.restarts ?? [],
    hourIndex,
    ({ namespace, workload }) => (namespace && workload ? `${namespace}/${workload}` : null),
    (v) => Math.round(Math.max(0, v)),
  );
  const cpu = usageByWorkload(inputs.cpu ?? []);
  const mem = usageByWorkload(inputs.mem ?? []);
  const restartsAvailable = inputs.restarts !== null;
  const noHours: HourValues = new Array<number | null>(hourCount).fill(null);

  const services: ServiceHealth[] = [...inventory.entries()].map(([key, row]) => {
    const workloadKey = `${row.namespace}/${row.name}`;
    const availValues = availability.get(key) ?? noHours;
    // Restarts are known only if the group was fulfilled AND this workload has
    // a series; a missing series is unknown (null), never 0. Inside an existing
    // series, hours without a point count as 0.
    const restartSeries = restartsAvailable ? restarts.get(workloadKey) : undefined;
    const restartsKnown = restartSeries !== undefined;
    const restartValues = restartSeries ? restartSeries.map((v) => v ?? 0) : noHours;

    const hours: HourlyAvailability[] = grid.hourStartsMs.map((startMs, i) => ({
      startMs,
      availability: availValues[i],
      restarts: restartValues[i],
      ongoing: i === hourCount - 1,
      status: classifyBucket(availValues[i], restartValues[i]),
    }));
    const hourly = hours.slice(-HOURS_SHOWN);

    const daily: DailyAvailability[] = grid.dayKeys.map((date) => {
      const idx = hoursByDay.get(date) ?? [];
      const { mean, count } = meanOf(idx.map((i) => availValues[i]));
      const dayRestarts = sumOf(idx.map((i) => restartValues[i]), restartsKnown);
      return {
        date,
        startMs: grid.hourStartsMs[idx[0]],
        hoursExpected: idx.length,
        hoursWithData: count,
        availability: mean,
        restarts: dayRestarts,
        isToday: date === today,
        status: classifyBucket(mean, dayRestarts),
      };
    });

    const avail24h = meanOf(hourly.map((h) => h.availability));
    const avail14d = meanOf(availValues);
    return {
      namespace: row.namespace,
      name: row.name,
      kind: row.kind,
      desiredReplicas: row.desiredReplicas,
      cpu: inputs.cpu === null ? null : (cpu.get(workloadKey) ?? null),
      mem: inputs.mem === null ? null : (mem.get(workloadKey) ?? null),
      daily,
      hourly,
      availability24h: avail24h.mean,
      availability14d: avail14d.mean,
      hoursWithData14d: avail14d.count,
      restarts24h: sumOf(hourly.map((h) => h.restarts), restartsKnown),
      restarts14d: sumOf(restartValues, restartsKnown),
    };
  });

  services.sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : a.namespace < b.namespace ? -1 : a.namespace > b.namespace ? 1 : 0,
  );

  return {
    generatedAtMs: grid.nowMs,
    window: {
      startMs: grid.hourStartsMs[0],
      endMs: grid.nowMs,
      days: DAYS_SHOWN,
      hours: hourCount,
      timeZone: SERVICE_HEALTH_TZ,
    },
    services,
    available: {
      availability: inputs.availability !== null,
      restarts: restartsAvailable,
      cpu: inputs.cpu !== null,
      mem: inputs.mem !== null,
    },
  };
}
