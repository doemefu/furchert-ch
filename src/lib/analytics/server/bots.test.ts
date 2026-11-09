import { describe, expect, it } from 'vitest';
import { isBotRequest } from './bots';

const ua = (v: string | null, extra: Record<string, string> = {}) => isBotRequest(new Headers({ ...(v === null ? {} : { 'User-Agent': v }), ...extra }));

describe('bot list (§5.7)', () => {
  it.each([
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPad; CPU OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 OPR/115.0.0.0',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1',
  ])('a real browser passes: %s', (value) => {
    expect(ua(value)).toBe(false);
  });

  it.each([
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)',
    'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/130.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 Chrome-Lighthouse',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 PTST/240901 Playwright',
    'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    'WhatsApp/2.23.20.0 A',
    'TelegramBot (like TwitterBot)',
    'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
    'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
    'curl/8.7.1 (x86_64-apple-darwin23.0) libcurl/8.7.1',
    'Wget/1.21.4 (linux-gnu) for site mirroring',
    'python-requests/2.32.3 compatible client',
    'axios/1.7.7 node.js client library',
    'Go-http-client/1.1 standard library client',
    'Java/17.0.12 HttpURLConnection client',
    'okhttp/4.12.0 android http client',
    'node-fetch/1.0 (+https://github.com/bitinn/node-fetch)',
    'Mozilla/5.0 (compatible; UptimeRobot/2.0; http://www.uptimerobot.com/)',
    'Feedly/1.0 (+http://www.feedly.com/fetcher.html; like FeedFetcher-Google)',
  ])('a bot is dropped: %s', (value) => {
    expect(ua(value)).toBe(true);
  });

  it('empty, missing or short User-Agents are dropped', () => {
    expect(ua('')).toBe(true);
    expect(ua(null)).toBe(true);
    expect(ua('Mozilla/5.0 (X11)')).toBe(true);
  });

  it('prefetch requests are dropped (Sec-Purpose or Purpose)', () => {
    const chrome = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
    expect(ua(chrome, { 'Sec-Purpose': 'prefetch;prerender' })).toBe(true);
    expect(ua(chrome, { Purpose: 'prefetch' })).toBe(true);
    expect(ua(chrome, { 'Sec-Purpose': 'other' })).toBe(false);
  });
});
