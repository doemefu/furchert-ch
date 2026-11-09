// Process-wide wiring of the analytics server side (spec 100 §3.10, §5.8,
// §5.10): one forward queue, one `analytics:write` token cache, the limiter
// instances and the eraser per process on `globalThis`, shared by `/api/v`,
// `/api/v/forget` and the contact Server Action. The queue flushes every 5 s
// and the erase retry sweeps every 5 min (unref'd timers). On SIGTERM the
// queue starts one last flush; Next's own shutdown may exit before it
// finishes, so delivery stays at-most-once (accepted).
import 'server-only';
import { AUTH_ENV } from '@/auth.env';
import { createClientCredentialsToken } from '@/lib/auth/clientCredentialsToken';
import { ANALYTICS_UI_ENABLED } from '../flags';
import type { CollectDeps, CollectLimits, ForgetDeps, ForgetLimits } from './collect';
import { ANALYTICS_ENV } from './env';
import { createCounterLog, createEraser, SWEEP_EVERY_MS, type Eraser } from './erase';
import { createLimiter } from './limiter';
import { createForwardQueue, type ForwardQueue } from './queue';

const QUEUE_KEY = Symbol.for('furchert.analytics.queue');
const EDGE_KEY = Symbol.for('furchert.analytics.edge');
const FLUSH_EVERY_MS = 5_000;
const MINUTE = 60_000;

interface Edge {
  collectLimits: CollectLimits;
  forgetLimits: ForgetLimits;
  eraser: Eraser;
  collectCount: (key: string, n?: number) => void;
  forgetCount: (key: string, n?: number) => void;
}

const token = createClientCredentialsToken('analytics:write', 'furchert.analytics.token', {
  tokenUrl: () => ANALYTICS_ENV.tokenUrl,
  clientId: () => AUTH_ENV.OIDC_CLIENT_ID,
  clientSecret: () => AUTH_ENV.OIDC_CLIENT_SECRET,
});

export function getForwardQueue(): ForwardQueue {
  const g = globalThis as typeof globalThis & { [QUEUE_KEY]?: ForwardQueue };
  if (!g[QUEUE_KEY]) {
    const queue = createForwardQueue({
      fetch: (input, init) => fetch(input, init),
      now: () => Date.now(),
      getToken: () => token.get(),
      invalidateToken: () => token.invalidate(),
      eventsUrl: () => ANALYTICS_ENV.eventsUrl,
      log: (line) => console.info(line),
    });
    const timer = setInterval(() => void queue.flush(), FLUSH_EVERY_MS);
    timer.unref?.();
    process.once('SIGTERM', () => void queue.flush());
    g[QUEUE_KEY] = queue;
  }
  return g[QUEUE_KEY];
}

/** Limiters, eraser and summary counters, one set per process (§5.8; WA-5). */
function edge(): Edge {
  const g = globalThis as typeof globalThis & { [EDGE_KEY]?: Edge };
  if (!g[EDGE_KEY]) {
    const log = (line: string) => console.info(line);
    const forgetLog = createCounterLog('[analytics] forget summary', log, Date.now, 60_000, {
      forbidden: 'check-analytics-write-scope-for-visitor-delete',
    });
    const collectLog = createCounterLog('[analytics] collect summary', log, Date.now);
    const forgetCount = forgetLog.count;
    const eraser = createEraser({
      fetch: (input, init) => fetch(input, init),
      now: () => Date.now(),
      getToken: () => token.get(),
      invalidateToken: () => token.invalidate(),
      visitorUrl: (id) => ANALYTICS_ENV.visitorUrl(id),
      count: forgetCount,
    });
    const sweep = setInterval(() => {
      void eraser.sweep();
      forgetLog.flush(); // review S7: pending counts are written even without new events
      collectLog.flush();
    }, SWEEP_EVERY_MS);
    sweep.unref?.();
    g[EDGE_KEY] = {
      collectLimits: {
        requestsPerKey: createLimiter({ limit: 20, windowMs: MINUTE }),
        requestsGlobal: createLimiter({ limit: 300, windowMs: MINUTE }),
        eventsPerKey: createLimiter({ limit: 200, windowMs: 10 * MINUTE }),
        eventsGlobal: createLimiter({ limit: 2_000, windowMs: MINUTE }),
        mintsPerKey: createLimiter({ limit: 5, windowMs: 60 * MINUTE }),
      },
      forgetLimits: {
        perKey: createLimiter({ limit: 30, windowMs: MINUTE }),
        global: createLimiter({ limit: 120, windowMs: MINUTE }),
      },
      eraser,
      collectCount: collectLog.count,
      forgetCount,
    };
  }
  return g[EDGE_KEY];
}

export function forgetDeps(): ForgetDeps {
  const e = edge();
  return {
    expectedOrigin: ANALYTICS_ENV.expectedOrigin,
    secureCookies: ANALYTICS_ENV.secureCookies,
    now: () => Date.now(),
    limits: e.forgetLimits,
    queue: getForwardQueue(),
    eraser: e.eraser,
    count: e.forgetCount,
  };
}

export function collectDeps(): CollectDeps {
  return {
    queue: getForwardQueue(),
    now: () => Date.now(),
    uiEnabled: ANALYTICS_UI_ENABLED,
    collectEnabled: ANALYTICS_ENV.collectEnabled,
    expectedOrigin: ANALYTICS_ENV.expectedOrigin,
    secureCookies: ANALYTICS_ENV.secureCookies,
    newVisitorId: () => crypto.randomUUID(),
    limits: edge().collectLimits,
    count: edge().collectCount,
  };
}
