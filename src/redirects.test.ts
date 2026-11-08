// Pins the redirects of `next.config.mjs` (#145): the vanity URLs `/ki` and
// `/bau` are temporary (307) because their target moves after Gate 0; the
// retired scan demo redirects permanently (308) to the locale's /automation.
// The exact rule list is asserted here; how Next matches it (status codes,
// case-insensitive sources, query pass-through) is checked with curl against
// `pnpm start` (see the PR).
import { describe, expect, it } from 'vitest';
import nextConfig from '../next.config.mjs';

describe('redirects (next.config.mjs)', () => {
  it('has exactly the four rules of the spec, in order', async () => {
    const rules = (await nextConfig.redirects!()).map(({ source, destination, permanent }) => ({
      source,
      destination,
      permanent,
    }));
    expect(rules).toEqual([
      { source: '/ki', destination: '/de/automation?utm_source=print&utm_medium=shortlink&utm_campaign=ki', permanent: false },
      { source: '/bau', destination: '/de/automation?utm_source=print&utm_medium=shortlink&utm_campaign=bau', permanent: false },
      {
        source: '/:locale(de|en)/automation/scan',
        destination: '/:locale/automation',
        permanent: true,
      },
      { source: '/automation/scan', destination: '/de/automation', permanent: true },
    ]);
  });

  it('keeps route matching case-insensitive (Next default), so /KI works too', () => {
    expect(nextConfig.experimental?.caseSensitiveRoutes).toBeUndefined();
  });
});
