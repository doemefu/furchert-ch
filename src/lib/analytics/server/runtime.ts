// Process-wide wiring of the analytics server side (spec 100 §3.10, §5.10):
// one forward queue and one `analytics:write` token cache per process on
// `globalThis`, shared by `/api/v` and the contact Server Action. The queue
// flushes every 5 s (unref'd timer). On SIGTERM it starts one last flush;
// Next's own shutdown may exit before it finishes, so delivery stays
// at-most-once (accepted).
import 'server-only';
import { AUTH_ENV } from '@/auth.env';
import { createClientCredentialsToken } from '@/lib/auth/clientCredentialsToken';
import { ANALYTICS_UI_ENABLED } from '../flags';
import type { CollectDeps } from './collect';
import { ANALYTICS_ENV } from './env';
import { createForwardQueue, type ForwardQueue } from './queue';

const QUEUE_KEY = Symbol.for('furchert.analytics.queue');
const FLUSH_EVERY_MS = 5_000;

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

export function collectDeps(): CollectDeps {
  return {
    queue: getForwardQueue(),
    now: () => Date.now(),
    uiEnabled: ANALYTICS_UI_ENABLED,
    collectEnabled: ANALYTICS_ENV.collectEnabled,
    expectedOrigin: ANALYTICS_ENV.expectedOrigin,
    secureCookies: ANALYTICS_ENV.secureCookies,
    newVisitorId: () => crypto.randomUUID(),
  };
}
