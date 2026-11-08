// Gate tests for /dashboard/analytics (spec 100 §9.1 C16; review L1): the
// page function is called with mocks and the returned element tree is
// inspected; no data-service call may happen before the ADMIN check.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';

const auth = vi.fn();
const read = { getStatus: vi.fn(), getOverview: vi.fn(), getPages: vi.fn(), getClicks: vi.fn(), getSources: vi.fn(), getPageDetail: vi.fn() };
vi.mock('@/auth', () => ({ auth }));
vi.mock('@/auth.env', () => ({ assertAuthEnv: vi.fn() }));
vi.mock('next-intl/server', () => ({ setRequestLocale: vi.fn(), getTranslations: vi.fn(async () => (k: string) => k) }));
vi.mock('@/lib/analytics/read', () => read);
vi.mock('../SignInGate', () => ({ SignInGate: function SignInGate() { return null; } }));
vi.mock('../NoAccess', () => ({ NoAccess: function NoAccess() { return null; } }));
vi.mock('../Subnav', () => ({ DevSubnav: function DevSubnav() { return null; } }));
vi.mock('./AnalyticsShell', () => ({ AnalyticsShell: function AnalyticsShell() { return null; } }));

const { default: AnalyticsPage } = await import('./page');
const { SignInGate } = await import('../SignInGate');
const { NoAccess } = await import('../NoAccess');
const { DevSubnav } = await import('../Subnav');
const { AnalyticsShell } = await import('./AnalyticsShell');

const call = (sp: Record<string, string> = {}) =>
  AnalyticsPage({ params: Promise.resolve({ locale: 'de' }), searchParams: Promise.resolve(sp) }) as Promise<ReactElement<{ children?: ReactElement[] }>>;
const kids = (el: ReactElement<{ children?: ReactElement[] }>) => ([] as ReactElement[]).concat(el.props.children ?? []);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('/dashboard/analytics gate', () => {
  it('without a session renders the sign-in gate and fetches nothing', async () => {
    auth.mockResolvedValue(null);
    const el = await call();
    expect(el.type).toBe(SignInGate);
    expect((el.props as { returnPath?: string }).returnPath).toBe('/dashboard/analytics');
    for (const fn of Object.values(read)) expect(fn).not.toHaveBeenCalled();
  });

  it('a USER gets DevSubnav + NoAccess, no AnalyticsShell and no data call', async () => {
    auth.mockResolvedValue({ user: { role: 'USER' } });
    const el = await call();
    const types = kids(el).map((k) => k.type);
    expect(types).toEqual([DevSubnav, NoAccess]);
    expect(types).not.toContain(AnalyticsShell);
    expect((kids(el)[0].props as { active: string }).active).toBe('analytics');
    for (const fn of Object.values(read)) expect(fn).not.toHaveBeenCalled();
  });

  it('a forged or missing role fails closed', async () => {
    auth.mockResolvedValue({ user: { role: 'admin' } });
    expect(kids(await call()).map((k) => k.type)).toEqual([DevSubnav, NoAccess]);
    auth.mockRejectedValue(new Error('boom'));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect((await call()).type).toBe(SignInGate);
  });

  it('an ADMIN gets DevSubnav (analytics tab) + the shell with validated controls', async () => {
    auth.mockResolvedValue({ user: { role: 'ADMIN' } });
    const el = await call({ range: '7d', page: '<script>', entry: 'en' });
    const [nav, shell] = kids(el);
    expect(nav.type).toBe(DevSubnav);
    expect((nav.props as { active: string }).active).toBe('analytics');
    expect(shell.type).toBe(AnalyticsShell);
    expect((shell.props as { controls: unknown }).controls).toEqual({ preset: '7d', invalidCustom: false, compare: true, entry: 'en' });
  });
});
