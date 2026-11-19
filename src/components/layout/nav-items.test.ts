import { describe, expect, it } from 'vitest';
import { ABOUT_NAV, BUSINESS_NAV, DESKTOP_NAV, isNavActive } from './nav-items';

describe('isNavActive', () => {
  it('matches the page and its sub-pages only', () => {
    expect(isNavActive('/projects', 'projects')).toBe(true);
    expect(isNavActive('/projects/homelab', 'projects')).toBe(true);
    expect(isNavActive('/projects-x', 'projects')).toBe(false);
    expect(isNavActive('/', 'about')).toBe(false);
  });
});

describe('nav structure', () => {
  it('has no Homelab entry and keeps the desktop nav to the five pages', () => {
    const all = [...BUSINESS_NAV, ...ABOUT_NAV] as string[];
    expect(all).not.toContain('dashboard');
    expect(all).not.toContain('homelab');
    expect(new Set(DESKTOP_NAV)).toEqual(new Set(all.filter((k) => k !== 'contact')));
  });
});
