// Rate limiters of `POST /api/v` and `POST /api/v/forget` (spec 100 §5.8;
// WA-5 #157, review M6). Two-bucket sliding-window counters: O(1) memory per
// key, the estimate is `previous · (1 − elapsed / window) + current`. Memory
// only, lost on restart; valid with `replicas: 1` (as the contact limiter).
// A check never charges and never creates a key; `checkAll` charges every
// window only when none of them would be exceeded.
import { isIP } from 'node:net';

interface State {
  start: number;
  current: number;
  previous: number;
}

export interface Limiter {
  /** True when `cost` more would exceed the limit. Pure: never charges, never creates a key. */
  wouldExceed(key: string, cost: number, now: number): boolean;
  charge(key: string, cost: number, now: number): void;
  /** Seconds until `cost` more fits, clamped to 1..600. */
  retryAfterS(key: string, cost: number, now: number): number;
  size(): number;
}

export const RETRY_AFTER_MAX_S = 600;

export function createLimiter(opts: { limit: number; windowMs: number; maxKeys?: number }): Limiter {
  const { limit, windowMs } = opts;
  const maxKeys = opts.maxKeys ?? 10_000;
  const states = new Map<string, State>();

  /** The state as of `now` (bucket roll applied), without storing it. */
  const view = (key: string, now: number): State => {
    const aligned = Math.floor(now / windowMs) * windowMs;
    const s = states.get(key);
    if (!s) return { start: aligned, current: 0, previous: 0 };
    if (now < s.start + windowMs) return s;
    if (now < s.start + 2 * windowMs) return { start: s.start + windowMs, current: 0, previous: s.current };
    return { start: aligned, current: 0, previous: 0 };
  };
  const estimate = (s: State, now: number) => s.previous * (1 - (now - s.start) / windowMs) + s.current;

  return {
    wouldExceed(key, cost, now) {
      return estimate(view(key, now), now) + cost > limit;
    },
    charge(key, cost, now) {
      const s = { ...view(key, now) };
      s.current += cost;
      // Review S3: delete + set keeps the Map in charge order, so eviction drops the least recently charged key.
      if (!states.delete(key) && states.size >= maxKeys) {
        const oldest = states.keys().next().value;
        if (oldest !== undefined) states.delete(oldest);
      }
      states.set(key, s);
    },
    retryAfterS(key, cost, now) {
      const s = view(key, now);
      let at: number;
      if (estimate(s, now) + cost <= limit) at = now;
      else if (cost > limit) at = Infinity;
      else if (s.current + cost <= limit) {
        // The previous bucket's share decays within this bucket.
        at = s.start + (1 - (limit - s.current - cost) / s.previous) * windowMs;
      } else {
        // Next bucket: this bucket's count becomes the decaying share.
        at = s.start + windowMs + (s.current > 0 ? Math.max(0, 1 - (limit - cost) / s.current) * windowMs : 0);
      }
      const seconds = Math.ceil((at - now) / 1000);
      return Math.min(RETRY_AFTER_MAX_S, Math.max(1, Number.isFinite(seconds) ? seconds : RETRY_AFTER_MAX_S));
    },
    size: () => states.size,
  };
}

export interface Check {
  limiter: Limiter;
  key: string;
  cost?: number;
}

/** Checks every window first; charges all of them only when none would be exceeded. */
export function checkAll(checks: Check[], now: number): { ok: true } | { ok: false; retryAfterS: number } {
  let retry = 0;
  for (const c of checks) {
    const cost = c.cost ?? 1;
    if (c.limiter.wouldExceed(c.key, cost, now)) retry = Math.max(retry, c.limiter.retryAfterS(c.key, cost, now));
  }
  if (retry > 0) return { ok: false, retryAfterS: retry };
  for (const c of checks) c.limiter.charge(c.key, c.cost ?? 1, now);
  return { ok: true };
}

export const UNKNOWN_KEY = 'unknown';

/** Expands an IPv6 address (no zone id) to eight 16-bit groups, or null. */
function ipv6Groups(ip: string): number[] | null {
  let text = ip.toLowerCase();
  const v4 = /(\d{1,3}(?:\.\d{1,3}){3})$/.exec(text);
  if (v4) {
    const o = v4[1].split('.').map(Number);
    text = `${text.slice(0, -v4[1].length)}${((o[0] << 8) | o[1]).toString(16)}:${((o[2] << 8) | o[3]).toString(16)}`;
  }
  const halves = text.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const fill = halves.length === 2 ? 8 - head.length - tail.length : 0;
  const parts = [...head, ...Array(Math.max(0, fill)).fill('0'), ...tail];
  if (parts.length !== 8) return null;
  const groups = parts.map((p) => parseInt(p, 16));
  return groups.every((g) => Number.isInteger(g) && g >= 0 && g <= 0xffff) ? groups : null;
}

/**
 * Limiter key (§5.8): `CF-Connecting-IP` only (review Q1; X-Forwarded-For is
 * client-controlled outside Cloudflare). IPv4 as is; IPv4-mapped IPv6 as its
 * IPv4; other IPv6 as its /64 prefix; missing or invalid → `'unknown'`.
 */
export function clientKey(headers: Headers): string {
  const raw = headers.get('cf-connecting-ip')?.trim() ?? '';
  if (!raw || raw.includes('%')) return UNKNOWN_KEY;
  const kind = isIP(raw);
  if (kind === 4) return raw;
  if (kind !== 6) return UNKNOWN_KEY;
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(raw);
  if (mapped && isIP(mapped[1]) === 4) return mapped[1];
  const g = ipv6Groups(raw);
  return g ? `${g.slice(0, 4).map((x) => x.toString(16)).join(':')}::/64` : UNKNOWN_KEY;
}
