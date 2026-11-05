import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './routing';

// The same middleware `src/proxy.ts` exports.
const middleware = createMiddleware(routing);
const request = (path: string) => new NextRequest(new URL(path, 'https://furchert.ch'));

describe('locale middleware', () => {
  it('sends no hreflang Link header (the HTML and the sitemap carry hreflang)', () => {
    const response = middleware(request('/de/about'));
    expect(response.headers.get('link') ?? '').not.toMatch(/hreflang/i);
  });

  it('still redirects the bare root to the German home page', () => {
    const response = middleware(request('/'));
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get('location') ?? '', 'https://furchert.ch').pathname).toBe('/de');
  });
});
