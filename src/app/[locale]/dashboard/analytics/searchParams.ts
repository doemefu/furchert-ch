// Search-param parsing for /[locale]/dashboard/analytics (spec 100 §9.1;
// WA-4a #155). Every URL value passes through here before it reaches
// data-service; anything malformed falls back to a default or is dropped.
// Links are built from the validated state only, never from raw input.
import { isTracked } from '@/lib/analytics/registry';

export type SearchParams = Record<string, string | string[] | undefined>;
export const PRESETS = ['7d', '28d', '90d', '12m'] as const;
export type Preset = (typeof PRESETS)[number] | 'custom';
export const CLICK_KINDS = ['cta', 'link', 'faq', 'lang', 'nav', 'outbound', 'mailto', 'tel'] as const;
export type ClickKind = (typeof CLICK_KINDS)[number];
export type Device = 'desktop' | 'mobile' | 'tablet';

export interface Controls {
  preset: Preset;
  from?: string;
  to?: string;
  /** A custom range was asked for but was not valid; the default is used and the page says so. */
  invalidCustom: boolean;
  compare: boolean;
  /** Entry-locale filter (API `locale`), named `entry` in the URL. */
  entry?: 'de' | 'en';
  device?: Device;
  /** Drilldown path; only a registry path (M1). */
  page?: string;
  kind?: ClickKind;
}

const PRESET_DAYS: Record<Exclude<Preset, 'custom' | '28d'>, number> = { '7d': 7, '90d': 90, '12m': 365 };
const DAY = 86_400_000;
const MAX_SPAN_DAYS = 366;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function isDate(v: string | undefined): v is string {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const t = Date.parse(`${v}T00:00:00Z`);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === v;
}
const days = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY) + 1;

export function parseControls(sp: SearchParams): Controls {
  const r = first(sp.range);
  const from = first(sp.from);
  const to = first(sp.to);
  let preset: Preset = PRESETS.includes(r as never) ? (r as Preset) : '28d';
  let invalidCustom = false;
  const c: Controls = { preset, invalidCustom, compare: first(sp.compare) !== 'none' };
  if (r === 'custom') {
    if (isDate(from) && isDate(to) && from <= to && days(from, to) <= MAX_SPAN_DAYS) {
      preset = 'custom';
      c.from = from;
      c.to = to;
    } else invalidCustom = true;
  }
  c.preset = preset;
  c.invalidCustom = invalidCustom;
  const entry = first(sp.entry);
  if (entry === 'de' || entry === 'en') c.entry = entry;
  const device = first(sp.device);
  if (device === 'desktop' || device === 'mobile' || device === 'tablet') c.device = device;
  const page = first(sp.page);
  if (page && isTracked(page)) c.page = page;
  const kind = first(sp.kind);
  if (CLICK_KINDS.includes(kind as ClickKind)) c.kind = kind as ClickKind;
  return c;
}

/** The preset needs `lastCompleteDay` (7d/90d/12m); 28d and custom do not (rulings M2, Q2). */
export const needsStatus = (c: Controls) => c.preset !== '28d' && c.preset !== 'custom';

/** `from`/`to` for the API; empty means the API default (28 days ending at lastCompleteDay). */
export function rangeQuery(c: Controls, lastCompleteDay: string | null | undefined): { from?: string; to?: string } {
  if (c.preset === 'custom') return { from: c.from, to: c.to };
  if (c.preset === '28d' || !isDate(lastCompleteDay ?? undefined)) return {};
  const n = PRESET_DAYS[c.preset];
  const to = lastCompleteDay as string;
  const fromT = Date.parse(`${to}T00:00:00Z`) - (n - 1) * DAY;
  return { from: new Date(fromT).toISOString().slice(0, 10), to };
}

/** A link to the page with the validated state plus changes; never raw input. */
export function hrefFor(c: Controls, change: Partial<Controls> = {}, hash?: string): string {
  const s = { ...c, ...change };
  const q = new URLSearchParams();
  if (s.preset !== '28d') q.set('range', s.preset);
  if (s.preset === 'custom' && s.from && s.to) {
    q.set('from', s.from);
    q.set('to', s.to);
  }
  if (!s.compare) q.set('compare', 'none');
  if (s.entry) q.set('entry', s.entry);
  if (s.device) q.set('device', s.device);
  if (s.page && isTracked(s.page)) q.set('page', s.page);
  if (s.kind) q.set('kind', s.kind);
  const qs = q.toString();
  return `/dashboard/analytics${qs ? `?${qs}` : ''}${hash ? `#${hash}` : ''}`;
}
