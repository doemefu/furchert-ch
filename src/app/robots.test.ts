import { describe, expect, it } from 'vitest';
import robots from './robots';

describe('robots', () => {
  const { rules, sitemap } = robots();
  const rule = Array.isArray(rules) ? rules[0] : rules;

  it('keeps the dashboard and the API out of crawlers', () => {
    expect(rule.userAgent).toBe('*');
    expect(rule.allow).toBe('/');
    expect(rule.disallow).toEqual(['/dashboard', '/de/dashboard', '/en/dashboard', '/api']);
    expect(sitemap).toBe('https://furchert.ch/sitemap.xml');
  });

  it('allows search and AI answers but not AI training (Content Signals)', () => {
    expect(rule.other).toEqual({ 'Content-Signal': 'search=yes, ai-input=yes, ai-train=no' });
  });
});
