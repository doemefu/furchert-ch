import { describe, expect, it } from 'vitest';
import { browserFamily, country, deviceClass, deviceContext, osFamily } from './ua';

const UA = {
  chromeMac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  safariMac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  ipad: 'Mozilla/5.0 (iPad; CPU OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  firefoxWin: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
  edgeWin: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
  androidPhone: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  androidTablet: 'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  samsung: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36',
  crios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1',
};

describe('ua.ts (§5.7)', () => {
  it('derives browser families, first match wins', () => {
    expect(browserFamily(UA.chromeMac)).toBe('chrome');
    expect(browserFamily(UA.safariMac)).toBe('safari');
    expect(browserFamily(UA.firefoxWin)).toBe('firefox');
    expect(browserFamily(UA.edgeWin)).toBe('edge');
    expect(browserFamily(UA.samsung)).toBe('other');
    expect(browserFamily(UA.crios)).toBe('chrome');
    expect(browserFamily('')).toBe('other');
  });

  it('derives OS families, the client hint wins', () => {
    expect(osFamily(UA.iphone, null)).toBe('ios');
    expect(osFamily(UA.androidPhone, null)).toBe('android');
    expect(osFamily(UA.firefoxWin, null)).toBe('windows');
    expect(osFamily(UA.chromeMac, null)).toBe('macos');
    expect(osFamily(UA.chromeMac, '"Windows"')).toBe('windows');
    expect(osFamily(UA.chromeMac, '"Chrome OS"')).toBe('linux');
    expect(osFamily('x', null)).toBe('other');
  });

  it('derives device classes', () => {
    expect(deviceClass(UA.iphone, null, 'ios')).toBe('mobile');
    expect(deviceClass(UA.androidPhone, null, 'android')).toBe('mobile');
    expect(deviceClass(UA.ipad, null, 'ios')).toBe('tablet');
    expect(deviceClass(UA.androidTablet, null, 'android')).toBe('tablet');
    expect(deviceClass(UA.chromeMac, '?1', 'macos')).toBe('mobile');
    expect(deviceClass(UA.chromeMac, '?0', 'macos')).toBe('desktop');
    expect(deviceClass('x', null, 'other')).toBe('other');
  });

  it('keeps only real country codes', () => {
    expect(country('CH')).toBe('CH');
    for (const v of ['XX', 'T1', 'ch', 'CHE', '', null]) expect(country(v), String(v)).toBeNull();
  });

  it('never returns the raw UA', () => {
    const ctx = deviceContext(new Headers({ 'user-agent': UA.chromeMac, 'cf-ipcountry': 'CH' }));
    expect(ctx).toEqual({ country: 'CH', deviceClass: 'desktop', browserFamily: 'chrome', osFamily: 'macos' });
    expect(JSON.stringify(ctx)).not.toContain('Mozilla');
  });
});
