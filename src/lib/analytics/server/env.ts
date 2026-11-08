// Server configuration of first-party web analytics (spec 100 §11). Lazy
// getters, read per request, so tests and a pod restart see the current env.
import 'server-only';
import { NETMON_ENV } from '@/netmon.env';

export const ANALYTICS_ENV = {
  /** Kill switch for `/api/v`, goal and enquiry (forget unaffected). Default on. */
  get collectEnabled(): boolean {
    return (process.env.ANALYTICS_COLLECT_ENABLED ?? '').trim().toLowerCase() !== 'false';
  },
  /** The only accepted `Origin` when `Sec-Fetch-Site` is absent. */
  get expectedOrigin(): string {
    const dev = process.env.ANALYTICS_DEV_ORIGIN?.trim();
    return dev ? dev.replace(/\/+$/, '') : 'https://furchert.ch';
  },
  /** `Secure` on the cookies; off outside production (plain-http local dev). */
  get secureCookies(): boolean {
    return process.env.NODE_ENV === 'production';
  },
  get eventsUrl(): string {
    return `${NETMON_ENV.DATA_SERVICE_URL.replace(/\/+$/, '')}/api/webanalytics/events`;
  },
  get tokenUrl(): string {
    return NETMON_ENV.DATA_SERVICE_TOKEN_URL;
  },
};
