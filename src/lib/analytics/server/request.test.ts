import { describe, expect, it } from 'vitest';
import { isJsonContentType, isSameOrigin, readCappedBody } from './request';

const streamOf = (chunks: string[], { hang = false } = {}) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(new TextEncoder().encode(c));
      if (!hang) controller.close();
    },
  });
const post = (body: BodyInit | null, headers: Record<string, string> = {}) =>
  new Request('http://localhost/api/v', { method: 'POST', body, headers, duplex: 'half' } as RequestInit);

describe('isJsonContentType (L7)', () => {
  it('accepts application/json with parameters, case-insensitive', () => {
    for (const v of ['application/json', 'Application/JSON', 'application/json; charset=utf-8', ' application/json ;x=1']) {
      expect(isJsonContentType(v), v).toBe(true);
    }
  });
  it('rejects everything else, including prefixes', () => {
    for (const v of [null, '', 'text/plain', 'application/jsonx', 'application/json-patch+json', 'application/x-www-form-urlencoded']) {
      expect(isJsonContentType(v), String(v)).toBe(false);
    }
  });
});

describe('isSameOrigin', () => {
  const origin = 'https://furchert.ch';
  it('trusts Sec-Fetch-Site when present', () => {
    expect(isSameOrigin(new Headers({ 'sec-fetch-site': 'same-origin' }), origin)).toBe(true);
    expect(isSameOrigin(new Headers({ 'sec-fetch-site': 'cross-site', origin }), origin)).toBe(false);
    expect(isSameOrigin(new Headers({ 'sec-fetch-site': 'same-site' }), origin)).toBe(false);
  });
  it('falls back to Origin, and rejects when both are missing', () => {
    expect(isSameOrigin(new Headers({ origin }), origin)).toBe(true);
    expect(isSameOrigin(new Headers({ origin: 'https://evil.example' }), origin)).toBe(false);
    expect(isSameOrigin(new Headers({ origin: 'null' }), origin)).toBe(false);
    expect(isSameOrigin(new Headers(), origin)).toBe(false);
  });
});

describe('readCappedBody (C1)', () => {
  it('reads a body under the cap', async () => {
    expect(await readCappedBody(post('{"a":1}'))).toEqual({ ok: true, text: '{"a":1}' });
  });
  it('rejects a declared Content-Length over 8 KiB unread', async () => {
    const req = post('x', { 'content-length': '8193' });
    expect(await readCappedBody(req)).toEqual({ ok: false, status: 413 });
  });
  it('counts a chunked stream and aborts past 8 KiB', async () => {
    const req = post(streamOf(['a'.repeat(5000), 'b'.repeat(3193)]));
    expect(await readCappedBody(req)).toEqual({ ok: false, status: 413 });
    const exact = post(streamOf(['a'.repeat(5000), 'b'.repeat(3192)]));
    expect((await readCappedBody(exact)).ok).toBe(true);
  });
  it('gives 408 when the body does not arrive within the deadline', async () => {
    const req = post(streamOf(['{'], { hang: true }));
    expect(await readCappedBody(req, { deadlineMs: 20 })).toEqual({ ok: false, status: 408 });
  });
  it('rejects invalid UTF-8', async () => {
    expect(await readCappedBody(post(new Uint8Array([0xff, 0xfe])))).toEqual({ ok: false, status: 400 });
  });
});
