// Request checks of `POST /api/v` and `POST /api/v/forget` (spec 100 §5.3
// steps 2 to 4, C1 and C4). Pure functions over a Fetch `Request`.

/** Step 2: the media type must be exactly `application/json` (parameters allowed). */
export function isJsonContentType(value: string | null): boolean {
  if (!value) return false;
  return value.split(';', 1)[0].trim().toLowerCase() === 'application/json';
}

/**
 * Step 3: `Sec-Fetch-Site: same-origin` when the browser sends it; otherwise
 * `Origin` must equal the expected origin; both absent is a rejection.
 */
export function isSameOrigin(headers: Headers, expectedOrigin: string): boolean {
  const site = headers.get('sec-fetch-site');
  if (site !== null) return site.trim().toLowerCase() === 'same-origin';
  const origin = headers.get('origin');
  return origin !== null && origin === expectedOrigin;
}

export type BodyResult = { ok: true; text: string } | { ok: false; status: 400 | 408 | 413 };

export interface ReadBodyOptions {
  maxBytes?: number;
  deadlineMs?: number;
  setTimeout?: (fn: () => void, ms: number) => unknown;
  clearTimeout?: (handle: unknown) => void;
}

/**
 * Step 4: rejects a declared `Content-Length` above the cap without reading;
 * otherwise reads the stream with a running byte count (chunked bodies
 * included), aborting at cap + 1 byte (413) or at the deadline (408).
 * Invalid UTF-8 is a 400. Never throws.
 */
export async function readCappedBody(req: Request, opts: ReadBodyOptions = {}): Promise<BodyResult> {
  const max = opts.maxBytes ?? 8192;
  const deadline = opts.deadlineMs ?? 5000;
  const setT = opts.setTimeout ?? ((fn, ms) => setTimeout(fn, ms));
  const clearT = opts.clearTimeout ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>));

  const declared = req.headers.get('content-length');
  if (declared !== null && /^\d+$/.test(declared.trim()) && Number(declared) > max) {
    await req.body?.cancel().catch(() => {});
    return { ok: false, status: 413 };
  }
  if (!req.body) return { ok: true, text: '' };

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let timer: unknown;
  const timedOut = new Promise<'timeout'>((resolve) => {
    timer = setT(() => resolve('timeout'), deadline);
  });
  try {
    for (;;) {
      const next = await Promise.race([reader.read(), timedOut]);
      if (next === 'timeout') {
        await reader.cancel().catch(() => {});
        return { ok: false, status: 408 };
      }
      if (next.done) break;
      total += next.value.byteLength;
      if (total > max) {
        await reader.cancel().catch(() => {});
        return { ok: false, status: 413 };
      }
      chunks.push(next.value);
    }
  } catch {
    return { ok: false, status: 400 };
  } finally {
    clearT(timer);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.byteLength;
  }
  try {
    return { ok: true, text: new TextDecoder('utf-8', { fatal: true }).decode(bytes) };
  } catch {
    return { ok: false, status: 400 };
  }
}
