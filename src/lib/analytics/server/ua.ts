// Server-side derivation of coarse device context (spec 100 §5.7, ua.ts).
// Families without versions; the raw User-Agent never leaves this module and
// is never stored or logged. The bot list is WA-5 (#157).

export type BrowserFamily = 'chrome' | 'firefox' | 'safari' | 'edge' | 'other';
export type OsFamily = 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'other';
export type DeviceClass = 'mobile' | 'tablet' | 'desktop' | 'other';

export function browserFamily(ua: string): BrowserFamily {
  if (/Edg\/|EdgA\/|EdgiOS\//.test(ua)) return 'edge';
  if (/OPR\/|Opera|SamsungBrowser/.test(ua)) return 'other';
  if (/Firefox\/|FxiOS/.test(ua)) return 'firefox';
  if (/CriOS|Chrome\/|Chromium/.test(ua)) return 'chrome';
  if (/Version\/.*Safari\//.test(ua)) return 'safari';
  return 'other';
}

const PLATFORM: Record<string, OsFamily> = {
  ios: 'ios',
  android: 'android',
  windows: 'windows',
  macos: 'macos',
  'chrome os': 'linux',
  chromeos: 'linux',
  linux: 'linux',
};

export function osFamily(ua: string, platformHint: string | null): OsFamily {
  const hint = platformHint?.replace(/"/g, '').trim().toLowerCase();
  if (hint && PLATFORM[hint]) return PLATFORM[hint];
  if (/iPhone|iPod|iPad/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  if (/Windows/.test(ua)) return 'windows';
  if (/Macintosh/.test(ua)) return 'macos';
  if (/CrOS|Linux/.test(ua)) return 'linux';
  return 'other';
}

// Deviation from the literal §5.7 order (noted for the spec): iPad Safari's
// UA contains "Mobile/", so iPad/Tablet are checked before `Mobi`; the
// `Sec-CH-UA-Mobile: ?1` hint still wins.
export function deviceClass(ua: string, mobileHint: string | null, os: OsFamily): DeviceClass {
  if (mobileHint?.trim() === '?1') return 'mobile';
  if (/iPad|Tablet/.test(ua)) return 'tablet';
  if (/Mobi|iPhone|iPod/.test(ua)) return 'mobile';
  if (/Android/.test(ua) && !/Mobile/.test(ua)) return 'tablet';
  if (os === 'windows' || os === 'macos' || os === 'linux') return 'desktop';
  return 'other';
}

/** `CF-IPCountry` if it is a real ISO alpha-2 code; `XX` (unknown) and `T1` (Tor) give null. */
export function country(header: string | null): string | null {
  const v = header?.trim() ?? '';
  return /^[A-Z]{2}$/.test(v) && v !== 'XX' && v !== 'T1' ? v : null;
}

export interface DeviceContext {
  country: string | null;
  deviceClass: DeviceClass;
  browserFamily: BrowserFamily;
  osFamily: OsFamily;
}

export function deviceContext(headers: Headers): DeviceContext {
  const ua = headers.get('user-agent') ?? '';
  const os = osFamily(ua, headers.get('sec-ch-ua-platform'));
  return {
    country: country(headers.get('cf-ipcountry')),
    deviceClass: deviceClass(ua, headers.get('sec-ch-ua-mobile'), os),
    browserFamily: browserFamily(ua),
    osFamily: os,
  };
}
