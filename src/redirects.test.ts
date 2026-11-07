// Pins the redirects of `next.config.mjs` (#145): the vanity URLs `/ki` and
// `/bau` are temporary (307) because their target moves after Gate 0; the
// retired scan demo redirects permanently (308) to the locale's /automation.
// The matching itself is checked with Next's own path matcher, configured the
// way Next 16 builds redirect routes (case-insensitive unless
// `experimental.caseSensitiveRoutes` is set).
import { describe, expect, it } from 'vitest';
import { getPathMatch } from 'next/dist/shared/lib/router/utils/path-match';
import nextConfig from '../next.config.mjs';

const rules = async () => {
  const list = await nextConfig.redirects!();
  return list.map(({ source, destination, permanent }) => ({
    source,
    destination,
    permanent,
  }));
};

// Resolve a request path the way the server does: first matching rule wins;
// `:param` segments in the destination take the matched value.
async function resolve(path: string): Promise<{ status: 307 | 308; location: string } | null> {
  for (const rule of await rules()) {
    const match = getPathMatch(rule.source, {
      strict: true,
      removeUnnamedParams: true,
      sensitive: nextConfig.experimental?.caseSensitiveRoutes ?? false,
    })(path);
    if (match) {
      const location = rule.destination.replace(/:(\w+)/g, (_, key: string) =>
        String((match as Record<string, string>)[key]),
      );
      return { status: rule.permanent ? 308 : 307, location };
    }
  }
  return null;
}

describe('redirects (next.config.mjs)', () => {
  it('has exactly the four rules of the spec, in order', async () => {
    expect(await rules()).toEqual([
      { source: '/ki', destination: '/de/automation', permanent: false },
      { source: '/bau', destination: '/de/automation', permanent: false },
      {
        source: '/:locale(de|en)/automation/scan',
        destination: '/:locale/automation',
        permanent: true,
      },
      { source: '/automation/scan', destination: '/de/automation', permanent: true },
    ]);
  });

  it('keeps route matching case-insensitive (Next default)', () => {
    expect(nextConfig.experimental?.caseSensitiveRoutes).toBeUndefined();
  });

  it('sends the vanity URLs temporarily to the German offer page', async () => {
    for (const path of ['/ki', '/bau', '/KI', '/Bau']) {
      expect(await resolve(path), path).toEqual({ status: 307, location: '/de/automation' });
    }
  });

  it('sends the retired scan demo permanently to the offer page of its locale', async () => {
    expect(await resolve('/automation/scan')).toEqual({ status: 308, location: '/de/automation' });
    expect(await resolve('/de/automation/scan')).toEqual({ status: 308, location: '/de/automation' });
    expect(await resolve('/en/automation/scan')).toEqual({ status: 308, location: '/en/automation' });
  });

  it('leaves real pages alone', async () => {
    for (const path of ['/', '/de', '/de/automation', '/en/automation', '/de/kimono', '/fr/automation/scan']) {
      expect(await resolve(path), path).toBeNull();
    }
  });
});
