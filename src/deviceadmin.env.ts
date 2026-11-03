// Lazy env accessor for the device-service REST API used by /dashboard/devices
// (#45; contract: device-service README "REST Endpoints" + "Schedules").
// Mirrors `authadmin.env.ts`: read at request time, never throws, never blocks
// `pnpm build`. A missing or unreachable device-service degrades the page to
// honest "unavailable" states (see `lib/deviceadmin/client.ts`).
//
// No new secret: requests carry the signed-in admin's own OIDC access token
// (`lib/authadmin/accessToken.ts`).

const DEFAULT_DEVICE_SERVICE_URL = 'http://device-service.apps.svc.cluster.local:8081';

export const DEVICEADMIN_ENV = {
  get DEVICE_SERVICE_URL(): string {
    const v = process.env.DEVICE_SERVICE_URL;
    // Trailing slash stripped: the client concatenates `/devices`, `/schedules`.
    return (v && v.length > 0 ? v : DEFAULT_DEVICE_SERVICE_URL).replace(/\/$/, '');
  },
};

// Local dev has no in-cluster DNS: outside production, skip every call unless
// the override is configured (same idea as `shouldAttemptAuthAdmin()`).
export function shouldAttemptDeviceAdmin(): boolean {
  if (process.env.NODE_ENV === 'production') return true;
  const v = process.env.DEVICE_SERVICE_URL;
  return Boolean(v && v.length > 0);
}
