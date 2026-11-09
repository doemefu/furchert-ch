// Bot and prefetch drop of `POST /api/v` (spec 100 §5.3 step 7, §5.7, C6;
// WA-5 #157). The raw User-Agent is read here and never stored or logged.

const BOT_UA =
  /bot|crawl|spider|slurp|scrap|fetch|preview|monitor|uptime|headless|lighthouse|pagespeed|gtmetrix|phantom|selenium|playwright|puppeteer|curl|wget|python|httpx|axios|go-http|java\/|okhttp|node-fetch|undici|libwww|feed|facebookexternalhit|embedly|whatsapp|telegram|discord|slack|bingpreview/i;

/** Empty or short (< 20 chars) User-Agent, a §5.7 bot token, or a prefetch request. */
export function isBotRequest(headers: Headers): boolean {
  const purpose = `${headers.get('sec-purpose') ?? ''} ${headers.get('purpose') ?? ''}`.toLowerCase();
  if (purpose.includes('prefetch')) return true;
  const ua = headers.get('user-agent')?.trim() ?? '';
  return ua.length < 20 || BOT_UA.test(ua);
}
