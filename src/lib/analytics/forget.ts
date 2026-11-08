// Client side of `POST /api/v/forget` (spec 100 §4.4, §5.4). The request is
// data-free: an empty JSON object; the server takes the id from the
// `fa_vid`/`fa_forget` cookies only. keepalive, so a forget sent while the
// page is closing still goes out. The route ships in WA-2b (#154).

export const FORGET_ENDPOINT = '/api/v/forget';

export type ForgetResult = { ok: true } | { ok: false; retryAfterMs: number | null };

/** `Retry-After` as delta-seconds in 1..600, in ms; anything else is null. */
export function parseRetryAfter(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const seconds = Number(value);
  return seconds >= 1 && seconds <= 600 ? seconds * 1000 : null;
}

/** Sends one forget. Success means 204; never throws. */
export async function sendForget(fetchFn: typeof fetch): Promise<ForgetResult> {
  try {
    const res = await fetchFn(FORGET_ENDPOINT, {
      method: 'POST',
      keepalive: true,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (res.status === 204) return { ok: true };
    return {
      ok: false,
      retryAfterMs: res.status === 429 ? parseRetryAfter(res.headers.get('Retry-After')) : null,
    };
  } catch {
    return { ok: false, retryAfterMs: null };
  }
}
