// Network monitoring shell (NM-1, #61; contract:
// infrastructure/docs/060-network-monitoring.md §8). Async Server Component:
// rendered only after page.tsx's ADMIN check, fetches data-service's read API
// server-side at request time, renders plain HTML. No client JS, no chart
// library — bars are <div>s and the timeline is inline SVG, reusing the
// DashboardShell idioms and ETHON tokens (no prototype exists for this page).
//
// Every section renders its own honest failure state; nothing is fabricated.
// Window (`?window=`), IP detail (`?ip=`) and firewall paging (`?fwCursor=`
// plus the pinned `?fwFrom=`/`?fwTo=` window) are search params, so every interaction is a server-rendered link.
// The LAN section (NM-3, #62) and the egress section (NM-2, #63) use the same
// page window.
import { isIP } from 'node:net';
import type { CSSProperties, ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { StatusDot, type DotStatus } from '@/components/ui/StatusDot';
import { Tag } from '@/components/ui/Tag';
import {
  getEgressTop,
  getFirewallEvents,
  getInboundSummary,
  getIpDetail,
  getLanConnections,
  getSshAuth,
  getStatus,
  getUfwBlocks,
  type CollectorStatus,
  type EgressFlow,
  type EgressTopResponse,
  type FirewallEvent,
  type IpDetail,
  type LanConnectionsResponse,
  type SshAuthResponse,
  type UfwBlocksResponse,
  type NetmonFailure,
  type NetmonResult,
  type TimeWindow,
} from '@/lib/netmon/client';
import { LOCALE_TAG } from '../datetime';

export const NETWORK_RANGES = ['24h', '7d', '30d'] as const;
export type NetworkRange = (typeof NETWORK_RANGES)[number];

const RANGE_HOURS: Record<NetworkRange, number> = { '24h': 24, '7d': 24 * 7, '30d': 24 * 30 };

type Translate = Awaited<ReturnType<typeof getTranslations>>;

// ── Helpers ─────────────────────────────────────────────────────────────────

// Maps the selected range to the API's `from`/`to` (§7.1), second precision.
function toWindow(range: NetworkRange, now: Date): TimeWindow {
  const to = new Date(Math.floor(now.getTime() / 1000) * 1000);
  const from = new Date(to.getTime() - RANGE_HOURS[range] * 3600 * 1000);
  const iso = (d: Date) => d.toISOString().replace('.000Z', 'Z');
  return { from: iso(from), to: iso(to) };
}

interface Formatters {
  num: (n: number) => string;
  /** Byte counts in SI units (kB, MB, GB). */
  bytes: (n: number) => string;
  time: (iso: string | null | undefined) => string;
  country: (code: string | null | undefined) => string;
}

function makeFormatters(locale: Locale): Formatters {
  const tag = LOCALE_TAG[locale];
  const numFmt = new Intl.NumberFormat(tag);
  // Pinned to Europe/Zurich like the dashboard header (pod TZ ≈ UTC).
  const timeFmt = new Intl.DateTimeFormat(tag, { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Zurich' });
  const byteUnits = ['byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte'] as const;
  const byteFmts = byteUnits.map(
    (unit) => new Intl.NumberFormat(tag, { style: 'unit', unit, unitDisplay: 'short', maximumFractionDigits: 1 }),
  );
  let regions: Intl.DisplayNames | null = null;
  try {
    regions = new Intl.DisplayNames([tag], { type: 'region' });
  } catch {
    regions = null;
  }
  return {
    num: (n) => (Number.isFinite(n) ? numFmt.format(n) : '—'),
    bytes: (n) => {
      if (!Number.isFinite(n)) return '—';
      let i = 0;
      while (i < byteUnits.length - 1 && Math.abs(n) >= 1000 ** (i + 1)) i++;
      // 999 950 B would round to "1,000 kB": step up when rounding reaches 1000.
      if (i < byteUnits.length - 1 && Math.abs(Math.round((n / 1000 ** i) * 10) / 10) >= 1000) i++;
      return byteFmts[i].format(n / 1000 ** i);
    },
    time: (iso) => {
      if (!iso) return '—';
      const d = new Date(iso);
      return Number.isNaN(d.getTime()) ? '—' : timeFmt.format(d);
    },
    country: (code) => {
      if (!code) return '—';
      try {
        const name = regions?.of(code.toUpperCase());
        return name && name !== code ? `${code} · ${name}` : code;
      } catch {
        return code;
      }
    },
  };
}

function asnLabel(asn: number | null | undefined, org: string | null | undefined): string {
  if (asn === null || asn === undefined) return org ?? '—';
  return org ? `AS${asn} · ${org}` : `AS${asn}`;
}

interface LinkState {
  range: NetworkRange;
  ip?: string;
  fwCursor?: string;
  fwWindow?: TimeWindow;
}

function pageHref({ range, ip, fwCursor, fwWindow }: LinkState) {
  const query: Record<string, string> = {};
  if (range !== '24h') query.window = range;
  if (ip) query.ip = ip;
  if (fwCursor) {
    query.fwCursor = fwCursor;
    if (fwWindow) {
      query.fwFrom = fwWindow.from;
      query.fwTo = fwWindow.to;
    }
  }
  return { pathname: '/dashboard/network', query };
}

// ── Styles (DashboardShell idioms) ──────────────────────────────────────────

const monoKicker: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: '.8125rem',
  letterSpacing: '.06em',
  textTransform: 'uppercase',
  color: 'var(--n-50)',
};

const monoLabel: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: '.72rem',
  letterSpacing: '.06em',
  textTransform: 'uppercase',
  color: 'var(--n-50)',
};

const privatePillStyle: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: '.68rem',
  letterSpacing: '.04em',
  textTransform: 'uppercase',
  padding: '.15rem .5rem',
  background: 'var(--blue-wash)',
  border: '1px solid rgba(14,60,166,.2)',
  borderRadius: '2px',
  color: 'var(--blue-base)',
};

const cardStyle: CSSProperties = {
  padding: '1rem',
  background: 'var(--white)',
  border: '1px solid rgba(162,167,176,.22)',
  borderRadius: '2px',
  minWidth: 0,
};

const noteStyle: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: '.68rem',
  letterSpacing: '.03em',
  color: 'var(--n-50)',
};

const sectionStyle: CSSProperties = { borderBottom: '1px solid rgba(162,167,176,.22)', padding: '1.5rem 0' };

const chipBase: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: '.72rem',
  letterSpacing: '.04em',
  textTransform: 'uppercase',
  textDecoration: 'none',
  border: '1px solid rgba(162,167,176,.3)',
  borderRadius: '2px',
  padding: '.35rem .75rem',
  color: 'var(--n-60)',
  background: 'var(--white)',
};

const chipActive: CSSProperties = {
  color: 'var(--blue-base)',
  borderColor: 'rgba(14,60,166,.35)',
  background: 'var(--blue-wash)',
};

const thStyle: CSSProperties = {
  ...monoLabel,
  fontSize: '.62rem',
  textAlign: 'left',
  fontWeight: 400,
  padding: '.5rem .75rem',
  borderBottom: '1px solid rgba(162,167,176,.3)',
  whiteSpace: 'nowrap',
};

const tdStyle: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: '.72rem',
  color: 'var(--n-80)',
  padding: '.45rem .75rem',
  borderBottom: '1px solid rgba(162,167,176,.15)',
  verticalAlign: 'top',
};

const ipLinkStyle: CSSProperties = { color: 'var(--blue-base)', textDecoration: 'none' };

const flagStyle: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: '.6rem',
  letterSpacing: '.04em',
  textTransform: 'uppercase',
  padding: '.05rem .35rem',
  borderRadius: '2px',
  border: '1px solid var(--status-offline)',
  color: 'var(--status-offline)',
  whiteSpace: 'nowrap',
};

// ── Small building blocks ───────────────────────────────────────────────────

function Failure({ result, t }: { result: NetmonFailure; t: Translate }) {
  let text: string;
  switch (result.kind) {
    case 'disabled':
      text = t('disabled');
      break;
    case 'problem':
      text = t('problem', { status: result.status, code: result.code });
      break;
    case 'malformed':
      text = t('malformed');
      break;
    default:
      text = t('unavailable');
  }
  return (
    <p role="status" style={noteStyle}>
      {text}
    </p>
  );
}

function Section({ id, title, aside, children }: { id: string; title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} style={sectionStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <h2 id={id} style={{ ...monoLabel, fontWeight: 400 }}>
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

interface BarRow {
  key: string;
  label: ReactNode;
  value: number;
}

// Horizontal div bars, scaled to the largest value in the list.
function BarList({ title, rows, fmt, emptyText }: { title: string; rows: BarRow[]; fmt: Formatters; emptyText: string }) {
  const max = rows.reduce((m, r) => Math.max(m, Number.isFinite(r.value) ? r.value : 0), 0);
  return (
    <div style={cardStyle}>
      <p style={{ ...monoLabel, fontSize: '.62rem', marginBottom: '.75rem' }}>{title}</p>
      {rows.length === 0 ? (
        <p style={noteStyle}>{emptyText}</p>
      ) : (
        <ul style={{ listStyle: 'none', display: 'grid', gap: '.5rem' }}>
          {rows.map((r) => {
            const pct = max > 0 && Number.isFinite(r.value) ? (r.value / max) * 100 : 0;
            return (
              <li key={r.key}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '.5rem',
                    fontFamily: 'var(--mono)',
                    fontSize: '.68rem',
                    color: 'var(--n-70)',
                    marginBottom: '.2rem',
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</span>
                  <span style={{ color: 'var(--n-60)', flexShrink: 0 }}>{fmt.num(r.value)}</span>
                </div>
                <div style={{ height: 4, background: 'var(--n-20)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: 'var(--blue-base)', borderRadius: '2px' }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div style={cardStyle}>
      <p style={{ ...monoLabel, fontSize: '.62rem', marginBottom: '.35rem' }}>{label}</p>
      <p style={{ fontFamily: 'var(--sans)', fontSize: '1.5rem', fontWeight: 500, letterSpacing: '-.03em', color: 'var(--n-100)' }}>
        {value}
      </p>
    </div>
  );
}

// Inline-SVG column chart; each bar carries a native <title> tooltip.
function Timeline({
  points,
  fmt,
  label,
}: {
  points: Array<{ bucketStart: string; requests: number }>;
  fmt: Formatters;
  label: string;
}) {
  const max = points.reduce((m, p) => Math.max(m, Number.isFinite(p.requests) ? p.requests : 0), 0);
  const barW = 10;
  const height = 64;
  return (
    <div style={cardStyle}>
      <p style={{ ...monoLabel, fontSize: '.62rem', marginBottom: '.75rem' }}>{label}</p>
      <svg
        role="img"
        aria-label={label}
        viewBox={`0 0 ${Math.max(points.length, 1) * barW} ${height}`}
        preserveAspectRatio="none"
        style={{ display: 'block', width: '100%', height, background: 'var(--n-10)' }}
      >
        {points.map((p, i) => {
          const v = Number.isFinite(p.requests) ? p.requests : 0;
          const h = max > 0 ? Math.max((v / max) * height, v > 0 ? 1 : 0) : 0;
          return (
            <rect key={p.bucketStart} x={i * barW + 1} y={height - h} width={barW - 2} height={h} fill="var(--blue-base)">
              <title>{`${fmt.time(p.bucketStart)} · ${fmt.num(v)}`}</title>
            </rect>
          );
        })}
      </svg>
      {points.length > 0 && (
        <div style={{ ...noteStyle, display: 'flex', justifyContent: 'space-between', marginTop: '.35rem' }}>
          <span>{fmt.time(points[0].bucketStart)}</span>
          <span>{fmt.time(points[points.length - 1].bucketStart)}</span>
        </div>
      )}
    </div>
  );
}

function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div style={{ ...cardStyle, padding: 0, overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>{children}</table>
    </div>
  );
}

function IpLink({ ip, range }: { ip: string; range: NetworkRange }) {
  return (
    <Link href={pageHref({ range, ip })} style={ipLinkStyle}>
      {ip}
    </Link>
  );
}

function FirewallTable({
  items,
  range,
  fmt,
  t,
}: {
  items: FirewallEvent[];
  range: NetworkRange;
  fmt: Formatters;
  t: Translate;
}) {
  if (items.length === 0) return <p style={noteStyle}>{t('empty')}</p>;
  return (
    <TableWrap>
      <thead>
        <tr>
          <th style={thStyle}>{t('inbound.firewall.time')}</th>
          <th style={thStyle}>{t('inbound.firewall.ip')}</th>
          <th style={thStyle}>{t('inbound.country')}</th>
          <th style={thStyle}>{t('inbound.firewall.action')}</th>
          <th style={thStyle}>{t('inbound.firewall.source')}</th>
          <th style={thStyle}>{t('inbound.firewall.rule')}</th>
          <th style={thStyle}>{t('inbound.firewall.request')}</th>
        </tr>
      </thead>
      <tbody>
        {items.map((e, i) => (
          <tr key={e.rayName ?? `${e.occurredAt}-${i}`}>
            <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{fmt.time(e.occurredAt)}</td>
            <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
              <IpLink ip={e.clientIp} range={range} />{' '}
              {e.blocklisted && <span style={flagStyle}>{t('inbound.blocklisted')}</span>}
            </td>
            <td style={tdStyle} title={fmt.country(e.country)}>
              {e.country ?? '—'}
            </td>
            <td style={tdStyle}>
              <Tag blue={e.action !== 'block'}>{e.action}</Tag>
            </td>
            <td style={tdStyle}>{e.securitySource ?? '—'}</td>
            <td style={{ ...tdStyle, maxWidth: '10rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={e.ruleId ?? undefined}>
              {e.ruleId ?? '—'}
            </td>
            <td style={{ ...tdStyle, maxWidth: '22rem', overflowWrap: 'anywhere' }}>
              {[e.method, e.host, e.path].filter(Boolean).join(' ') || '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </TableWrap>
  );
}

// ── Sections ────────────────────────────────────────────────────────────────

function collectorDot(c: CollectorStatus): { status: DotStatus; key: 'disabled' | 'stale' | 'failing' | 'ok' } {
  if (!c.enabled) return { status: 'unknown', key: 'disabled' };
  if (c.stale) return { status: 'offline', key: 'stale' };
  if (c.consecutiveFailures > 0) return { status: 'wip', key: 'failing' };
  return { status: 'online', key: 'ok' };
}

function StatusStrip({ result, fmt, t }: { result: NetmonResult<{ collectors: CollectorStatus[] }>; fmt: Formatters; t: Translate }) {
  return (
    <Section id="netmon-status" title={t('status.title')}>
      {!result.ok ? (
        <Failure result={result} t={t} />
      ) : result.data.collectors.length === 0 ? (
        <p style={noteStyle}>{t('status.none')}</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '.75rem' }}>
          {result.data.collectors.map((c) => {
            const dot = collectorDot(c);
            return (
              <div key={c.name} style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.4rem' }}>
                  <StatusDot status={dot.status} label={t(`status.${dot.key}`)} />
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '.75rem', fontWeight: 500, color: 'var(--n-100)' }}>{c.name}</span>
                  <span style={{ ...noteStyle, marginLeft: 'auto' }}>{t(`status.${dot.key}`)}</span>
                </div>
                <p style={noteStyle}>
                  {c.lastSuccessAt ? t('status.lastSuccess', { time: fmt.time(c.lastSuccessAt) }) : t('status.neverSucceeded')}
                </p>
                {c.consecutiveFailures > 0 && (
                  <p style={noteStyle}>
                    {t('status.failures', { count: c.consecutiveFailures })}
                    {c.lastErrorCode ? ` · ${t('status.error', { code: c.lastErrorCode })}` : ''}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}

function IpPanel({
  ip,
  invalidIp,
  result,
  range,
  detailRange,
  fmt,
  t,
}: {
  ip?: string;
  invalidIp: boolean;
  result: NetmonResult<IpDetail> | null;
  range: NetworkRange;
  detailRange: NetworkRange;
  fmt: Formatters;
  t: Translate;
}) {
  const close = (
    <Link href={pageHref({ range })} style={{ ...chipBase, padding: '.2rem .6rem', marginLeft: 'auto' }}>
      {t('ip.close')}
    </Link>
  );
  let body: ReactNode;
  if (invalidIp) {
    body = <p style={noteStyle}>{t('ip.invalid')}</p>;
  } else if (!result) {
    body = null;
  } else if (!result.ok) {
    body =
      result.kind === 'problem' && result.status === 404 ? (
        <p style={noteStyle}>{t('ip.notFound')}</p>
      ) : result.kind === 'problem' && result.status === 400 ? (
        <p style={noteStyle}>{t('ip.invalid')}</p>
      ) : (
        <Failure result={result} t={t} />
      );
  } else {
    const d = result.data;
    const facts: Array<[string, ReactNode]> = [
      [t('ip.firstSeen'), fmt.time(d.firstSeen)],
      [t('ip.lastSeen'), fmt.time(d.lastSeen)],
      [t('ip.seenIn'), d.seenIn.length > 0 ? d.seenIn.join(', ') : '—'],
      [t('inbound.country'), fmt.country(d.country)],
      [t('inbound.asn'), asnLabel(d.asn, d.asnOrg)],
      [
        t('ip.abuseScore'),
        d.abuseIpDb
          ? `${fmt.num(d.abuseIpDb.score)} · ${t('ip.abuseReports', { count: d.abuseIpDb.reports })} · ${fmt.time(d.abuseIpDb.checkedAt)}`
          : t('ip.notChecked'),
      ],
      [t('inbound.requests'), d.inbound ? fmt.num(d.inbound.requests) : '—'],
    ];
    if (d.logins) {
      facts.push([t('ip.logins'), t('ip.loginsValue', { success: d.logins.success, failure: d.logins.failure, locked: d.logins.locked })]);
    }
    if (d.lan) {
      facts.push([t('ip.lan'), t('ip.lanValue', { ufwBlocks: d.lan.ufwBlocks, sshFailed: d.lan.sshFailed })]);
    }
    body = (
      <div style={{ display: 'grid', gap: '.75rem' }}>
        <p style={noteStyle}>{t('ip.window', { window: t(`window.${detailRange}`) })}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '.75rem' }}>
          <div style={cardStyle}>
            <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '.35rem .75rem' }}>
              {facts.map(([k, v]) => (
                <div key={k} style={{ display: 'contents' }}>
                  <dt style={{ ...monoLabel, fontSize: '.62rem' }}>{k}</dt>
                  <dd style={{ fontFamily: 'var(--mono)', fontSize: '.72rem', color: 'var(--n-80)', overflowWrap: 'anywhere' }}>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div style={cardStyle}>
            <p style={{ ...monoLabel, fontSize: '.62rem', marginBottom: '.5rem' }}>{t('ip.blocklists')}</p>
            {d.blocklists.length === 0 ? (
              <p style={noteStyle}>{t('ip.noBlocklists')}</p>
            ) : (
              <ul style={{ listStyle: 'none', display: 'grid', gap: '.35rem' }}>
                {d.blocklists.map((b) => (
                  <li key={`${b.list}-${b.cidr}`} style={{ fontFamily: 'var(--mono)', fontSize: '.72rem', color: 'var(--n-80)' }}>
                    <span style={flagStyle}>{b.list}</span> {b.cidr}
                    <span style={{ ...noteStyle, marginLeft: '.5rem' }}>{fmt.time(b.fetchedAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        {d.inbound && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '.75rem' }}>
            <BarList
              title={t('inbound.hosts')}
              rows={d.inbound.topHosts.map((h) => ({ key: h.host, label: h.host, value: h.requests }))}
              fmt={fmt}
              emptyText={t('empty')}
            />
            <BarList
              title={t('inbound.paths')}
              rows={d.inbound.topPaths.map((p) => ({ key: `${p.host}${p.path}`, label: `${p.host}${p.path}`, value: p.requests }))}
              fmt={fmt}
              emptyText={t('empty')}
            />
            <BarList
              title={t('inbound.statuses')}
              rows={d.inbound.statuses.map((s) => ({ key: String(s.status), label: String(s.status), value: s.requests }))}
              fmt={fmt}
              emptyText={t('empty')}
            />
          </div>
        )}
        <p style={{ ...monoLabel, fontSize: '.62rem' }}>{t('inbound.firewall.title')}</p>
        <FirewallTable items={d.firewallEvents} range={range} fmt={fmt} t={t} />
      </div>
    );
  }

  return (
    <Section
      id="netmon-ip"
      title={t('ip.title')}
      aside={
        <>
          {ip && <span style={{ fontFamily: 'var(--mono)', fontSize: '.8rem', color: 'var(--n-100)' }}>{ip}</span>}
          {close}
        </>
      }
    >
      {body}
    </Section>
  );
}

// ── LAN (NM-3) ──────────────────────────────────────────────────────────────

// Watched ports of the node collector (§5.1 `netmon_node_ports`). Service
// names are proper nouns and stay untranslated.
const LAN_PORT_NAMES: Record<number, string> = {
  22: 'SSH',
  1883: 'MQTT',
  6443: 'Kubernetes API',
  8123: 'Home Assistant',
  10250: 'kubelet',
};

const POD_CIDR_LABEL = '10.42.0.0/16';

const subheadStyle: CSSProperties = { ...monoLabel, fontSize: '.62rem', fontWeight: 400 };

// `srcIp` is not always an address (§5.2): the pod CIDR and the overflow
// bucket `other` are rendered as labels; only real IPs link to the IP panel.
function LanSource({ srcIp, range, t }: { srcIp: string; range: NetworkRange; t: Translate }) {
  if (srcIp === POD_CIDR_LABEL) return <>{`${srcIp} · ${t('lan.podNetwork')}`}</>;
  if (srcIp === 'other') return <>{t('lan.other')}</>;
  return isIP(srcIp) !== 0 ? <IpLink ip={srcIp} range={range} /> : <>{srcIp}</>;
}

function SubBlock({ id, title, aside, children }: { id: string; title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <div role="group" aria-labelledby={id} style={{ display: 'grid', gap: '.75rem', marginTop: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap' }}>
        <h3 id={id} style={subheadStyle}>
          {title}
        </h3>
        {aside}
      </div>
      {children}
    </div>
  );
}

const isNotDeployed = (r: NetmonResult<unknown>) => !r.ok && r.kind === 'problem' && r.status === 404;

// True while a snapshot collector provably has no source data yet: it is not
// reported, it is enabled but has never succeeded, or its last run succeeded
// with an `upstream` warning (data-service records "no nodes" / "no series"
// as a success with lastErrorCode 'upstream' and 0 consecutive failures).
// Real outages (consecutiveFailures > 0) and disabled collectors do not
// count: the status strip shows those, and the blocks fall back to their
// plain empty notes.
function hasNoSourceData(status: NetmonResult<{ collectors: CollectorStatus[] }>, name: string): boolean {
  if (!status.ok) return false;
  const c = status.data.collectors.find((x) => x.name === name);
  if (!c) return true;
  if (!c.enabled) return false;
  return !c.lastSuccessAt || (c.lastErrorCode === 'upstream' && c.consecutiveFailures === 0);
}

function LanConnectionsBlock({
  result,
  range,
  fmt,
  t,
}: {
  result: NetmonResult<LanConnectionsResponse>;
  range: NetworkRange;
  fmt: Formatters;
  t: Translate;
}) {
  let body: ReactNode;
  if (!result.ok) {
    body = <Failure result={result} t={t} />;
  } else if (result.data.items.length === 0) {
    body = <p style={noteStyle}>{t('empty')}</p>;
  } else {
    const items = result.data.items;
    const ports = [...new Set(items.map((c) => c.dport))].sort((a, b) => a - b);
    body = (
      <>
        <p style={noteStyle}>{t('lan.connectionsNote')}</p>
        {ports.map((port) => {
          const rows = items.filter((c) => c.dport === port).sort((a, b) => b.peakConnections - a.peakConnections);
          const name = LAN_PORT_NAMES[port];
          return (
            <div key={port} style={{ display: 'grid', gap: '.35rem' }}>
              <p style={{ fontFamily: 'var(--mono)', fontSize: '.75rem', fontWeight: 500, color: 'var(--n-100)' }}>
                {name ? `${port} · ${name}` : String(port)}
              </p>
              <TableWrap>
                <thead>
                  <tr>
                    <th style={thStyle}>{t('lan.source')}</th>
                    <th style={thStyle}>{t('lan.node')}</th>
                    <th style={thStyle}>{t('lan.state')}</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>{t('lan.peak')}</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>{t('lan.windows')}</th>
                    <th style={thStyle}>{t('lan.lastSeen')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={`${c.node}-${c.srcIp}-${c.state}`}>
                      <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                        <LanSource srcIp={c.srcIp} range={range} t={t} />
                      </td>
                      <td style={tdStyle}>{c.node}</td>
                      <td style={tdStyle}>{c.state}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt.num(c.peakConnections)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt.num(c.windows)}</td>
                      <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{fmt.time(c.lastSeen)}</td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            </div>
          );
        })}
      </>
    );
  }
  return (
    <SubBlock id="netmon-lan-connections" title={t('lan.connections')}>
      {body}
    </SubBlock>
  );
}

// Sums `value` per key and returns the top `n` rows, largest first.
function topBy<T>(items: T[], key: (x: T) => string, value: (x: T) => number, n: number): Array<{ key: string; value: number }> {
  const sums = new Map<string, number>();
  for (const x of items) sums.set(key(x), (sums.get(key(x)) ?? 0) + value(x));
  return [...sums.entries()]
    .map(([k, v]) => ({ key: k, value: v }))
    .sort((a, b) => b.value - a.value)
    .slice(0, n);
}

function UfwBlocksBlock({
  result,
  range,
  fmt,
  t,
}: {
  result: NetmonResult<UfwBlocksResponse>;
  range: NetworkRange;
  fmt: Formatters;
  t: Translate;
}) {
  let body: ReactNode;
  if (!result.ok) {
    body = <Failure result={result} t={t} />;
  } else if (result.data.items.length === 0 && result.data.totals.blocks === 0) {
    body = <p style={noteStyle}>{t('empty')}</p>;
  } else {
    const items = [...result.data.items].sort((a, b) => b.blocks - a.blocks);
    const sources = topBy(items, (r) => r.srcIp, (r) => r.blocks, 10);
    const ports = topBy(items, (r) => `${r.dport}/${r.proto}`, (r) => r.blocks, 10);
    body = (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '.75rem' }}>
          <StatTile label={t('lan.ufwTotal')} value={fmt.num(result.data.totals.blocks)} />
        </div>
        <p style={noteStyle}>{t('lan.ufwNote')}</p>
        {items.length > 0 && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '.75rem' }}>
              <BarList
                title={t('lan.topSources')}
                rows={sources.map((s) => ({ key: s.key, label: <LanSource srcIp={s.key} range={range} t={t} />, value: s.value }))}
                fmt={fmt}
                emptyText={t('empty')}
              />
              <BarList
                title={t('lan.topPorts')}
                rows={ports.map((p) => ({ key: p.key, label: p.key, value: p.value }))}
                fmt={fmt}
                emptyText={t('empty')}
              />
            </div>
            <p style={noteStyle}>{t('lan.fromListedRows', { count: items.length })}</p>
            <TableWrap>
              <thead>
                <tr>
                  <th style={thStyle}>{t('lan.source')}</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>{t('lan.port')}</th>
                  <th style={thStyle}>{t('lan.proto')}</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>{t('lan.blocks')}</th>
                  <th style={thStyle}>{t('lan.nodes')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={`${r.srcIp}-${r.dport}-${r.proto}`}>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                      <LanSource srcIp={r.srcIp} range={range} t={t} />
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{r.dport}</td>
                    <td style={tdStyle}>{r.proto}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt.num(r.blocks)}</td>
                    <td style={tdStyle}>{Array.isArray(r.nodes) && r.nodes.length > 0 ? r.nodes.join(', ') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </>
        )}
      </>
    );
  }
  return (
    <SubBlock id="netmon-lan-ufw" title={t('lan.ufwBlocks')} aside={<Tag>{t('lowerBound')}</Tag>}>
      {body}
    </SubBlock>
  );
}

function SshAuthBlock({
  result,
  range,
  fmt,
  t,
}: {
  result: NetmonResult<SshAuthResponse>;
  range: NetworkRange;
  fmt: Formatters;
  t: Translate;
}) {
  let body: ReactNode;
  if (!result.ok) {
    body = <Failure result={result} t={t} />;
  } else if (result.data.items.length === 0) {
    body = <p style={noteStyle}>{t('empty')}</p>;
  } else {
    const rows = [...result.data.items].sort(
      (a, b) => b.failed + b.invalidUser - (a.failed + a.invalidUser) || b.accepted - a.accepted,
    );
    const sum = (f: (r: (typeof rows)[number]) => number) => rows.reduce((acc, r) => acc + (Number.isFinite(f(r)) ? f(r) : 0), 0);
    body = (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '.75rem' }}>
          <StatTile label={t('lan.accepted')} value={fmt.num(sum((r) => r.accepted))} />
          <StatTile label={t('lan.failed')} value={fmt.num(sum((r) => r.failed))} />
          <StatTile label={t('lan.invalidUser')} value={fmt.num(sum((r) => r.invalidUser))} />
        </div>
        <p style={noteStyle}>{t('lan.sshNote')}</p>
        <TableWrap>
          <thead>
            <tr>
              <th style={thStyle}>{t('lan.source')}</th>
              <th style={thStyle}>{t('lan.node')}</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>{t('lan.accepted')}</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>{t('lan.failed')}</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>{t('lan.invalidUser')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.node}-${r.srcIp}`}>
                <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                  <LanSource srcIp={r.srcIp} range={range} t={t} />
                </td>
                <td style={tdStyle}>{r.node}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt.num(r.accepted)}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt.num(r.failed)}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt.num(r.invalidUser)}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </>
    );
  }
  return (
    <SubBlock id="netmon-lan-ssh" title={t('lan.sshAuth')} aside={<Tag>{t('lan.failedLowerBound')}</Tag>}>
      {body}
    </SubBlock>
  );
}

function LanSection({
  connections,
  ufw,
  ssh,
  status,
  range,
  fmt,
  t,
}: {
  connections: NetmonResult<LanConnectionsResponse>;
  ufw: NetmonResult<UfwBlocksResponse>;
  ssh: NetmonResult<SshAuthResponse>;
  status: NetmonResult<{ collectors: CollectorStatus[] }>;
  range: NetworkRange;
  fmt: Formatters;
  t: Translate;
}) {
  let body: ReactNode;
  if (isNotDeployed(connections) && isNotDeployed(ufw) && isNotDeployed(ssh)) {
    // data-service without the NM-3 read API (homelab-data-service#15).
    body = <p style={noteStyle}>{t('notYetAvailable', { subproject: 'NM-3' })}</p>;
  } else {
    // "No data yet" only when it is provable: every LAN call succeeded with
    // nothing in it AND the `lan` collector has no source data yet
    // (`hasNoSourceData`) — i.e. the node role has not been rolled out. Otherwise
    // each block shows its own empty/failure state.
    const allEmpty =
      connections.ok &&
      connections.data.items.length === 0 &&
      ufw.ok &&
      ufw.data.items.length === 0 &&
      ufw.data.totals.blocks === 0 &&
      ssh.ok &&
      ssh.data.items.length === 0;
    const neverCollected = hasNoSourceData(status, 'lan');
    body =
      allEmpty && neverCollected ? (
        <p role="status" style={noteStyle}>
          {t('lan.noDataYet')}
        </p>
      ) : (
        <>
          <LanConnectionsBlock result={connections} range={range} fmt={fmt} t={t} />
          <UfwBlocksBlock result={ufw} range={range} fmt={fmt} t={t} />
          <SshAuthBlock result={ssh} range={range} fmt={fmt} t={t} />
        </>
      );
  }
  return (
    <Section id="netmon-lan" title={t('lan.title')}>
      <p style={{ fontSize: '.85rem', color: 'var(--n-60)', lineHeight: 1.5, maxWidth: '44rem' }}>{t('lan.subtitle')}</p>
      {body}
    </Section>
  );
}

// ── Egress (NM-2) ───────────────────────────────────────────────────────────

function isPublicIpv4(ip: string): boolean {
  const [a, b, c] = ip.split('.').map(Number);
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false; // this-net, RFC 1918, loopback, multicast/reserved
  if (a === 100 && b >= 64 && b <= 127) return false; // CGNAT
  if (a === 169 && b === 254) return false; // link-local
  if (a === 172 && b >= 16 && b <= 31) return false; // RFC 1918
  if (a === 192 && b === 168) return false; // RFC 1918
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return false; // IETF protocol assignments, TEST-NET-1
  if (a === 198 && (b === 18 || b === 19)) return false; // benchmarking
  if ((a === 198 && b === 51 && c === 100) || (a === 203 && b === 0 && c === 113)) return false; // TEST-NET-2/3
  return true;
}

// Expands an `isIP`-validated IPv6 literal (incl. `::` and an embedded IPv4
// tail) to its eight 16-bit groups.
function ipv6Groups(ip: string): number[] {
  let s = ip.toLowerCase().split('%')[0];
  const v4 = /(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(s);
  if (v4) {
    const [a, b, c, d] = v4.slice(1).map(Number);
    s = `${s.slice(0, v4.index)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const [head, tail] = s.split('::');
  const h = head ? head.split(':') : [];
  const t = tail ? tail.split(':') : [];
  const fill = s.includes('::') ? 8 - h.length - t.length : 0;
  return [...h, ...Array<string>(fill).fill('0'), ...t].map((x) => parseInt(x, 16));
}

// Only public addresses are linked to the IP panel: `scope=external` is
// decided by data-service's configured CIDRs (§3.3), so a CGNAT or ULA
// destination could still appear and would only open an empty panel.
function isPublicIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isPublicIpv4(ip);
  if (version !== 6) return false;
  const g = ipv6Groups(ip);
  // ::ffff:a.b.c.d (IPv4-mapped) → the IPv4 rule
  if (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff) return isPublicIpv4(`${g[6] >> 8}.${g[6] & 255}.${g[7] >> 8}.${g[7] & 255}`);
  if (g[0] === 0) return false; // ::, ::1, IPv4-compatible
  if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0)) return false; // NAT64 64:ff9b::/96
  if (g[0] === 0x2001 && g[1] === 0x0db8) return false; // documentation 2001:db8::/32
  // fc00::/7 unique-local, fe80::/10 link-local, ff00::/8 multicast
  return (g[0] & 0xfe00) !== 0xfc00 && (g[0] & 0xffc0) !== 0xfe80 && (g[0] & 0xff00) !== 0xff00;
}

const flowBytes = (f: EgressFlow) =>
  (Number.isFinite(f.bytesSent) ? f.bytesSent : 0) + (Number.isFinite(f.bytesReceived) ? f.bytesReceived : 0);

// Host processes have no namespace/workload (§3.3). A pod whose workload
// could not be derived falls back to its container, still namespaced.
function workloadLabel(f: EgressFlow, t: Translate): string {
  const name = f.workload ?? f.container;
  if (!name) return f.namespace ? `${f.namespace}/${t('egress.hostProcess')}` : t('egress.hostProcess');
  return f.namespace ? `${f.namespace}/${name}` : name;
}

// Group identity is the (namespace, workload) pair — or (namespace,
// container) without a workload — never the display label, so groups from
// different namespaces cannot merge.
const workloadKey = (f: EgressFlow) => JSON.stringify([f.namespace, f.workload, f.workload === null ? f.container : null]);
const flowKey = (f: EgressFlow) => JSON.stringify([f.namespace, f.workload, f.container, f.destinationIp, f.destinationPort]);

function EgressDestination({ flow, range }: { flow: EgressFlow; range: NetworkRange }) {
  const ip = flow.destinationIp;
  const ipNode = isPublicIp(ip) ? <IpLink ip={ip} range={range} /> : <>{ip}</>;
  const address = ip.includes(':') ? (
    <>
      [{ipNode}]:{flow.destinationPort}
    </>
  ) : (
    <>
      {ipNode}:{flow.destinationPort}
    </>
  );
  if (!flow.fqdn) return address;
  return (
    <>
      <span style={{ color: 'var(--n-100)', overflowWrap: 'anywhere' }}>{flow.fqdn}</span>
      <br />
      <span style={noteStyle}>{address}</span>
    </>
  );
}

function EgressTable({ rows, range, fmt, t }: { rows: EgressFlow[]; range: NetworkRange; fmt: Formatters; t: Translate }) {
  const bytesCell = (n: number) => (
    <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' }} title={Number.isFinite(n) ? t('egress.bytesExact', { bytes: fmt.num(n) }) : undefined}>
      {fmt.bytes(n)}
    </td>
  );
  return (
    <TableWrap>
      <thead>
        <tr>
          <th style={thStyle}>{t('egress.destination')}</th>
          <th style={thStyle}>{t('egress.container')}</th>
          <th style={thStyle}>{t('egress.node')}</th>
          <th style={{ ...thStyle, textAlign: 'right' }}>{t('egress.bytesSent')}</th>
          <th style={{ ...thStyle, textAlign: 'right' }}>{t('egress.bytesReceived')}</th>
          <th style={{ ...thStyle, textAlign: 'right' }}>{t('egress.connects')}</th>
          <th style={{ ...thStyle, textAlign: 'right' }}>{t('egress.failedConnects')}</th>
          <th style={thStyle}>{t('egress.firstSeen')}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((f) => (
          <tr key={flowKey(f)}>
            <td style={{ ...tdStyle, minWidth: '14rem' }}>
              <EgressDestination flow={f} range={range} />
              {f.isNew && (
                <>
                  {' '}
                  <span title={t('egress.newHint')}>
                    <Tag blue>{t('egress.new')}</Tag>
                  </span>
                </>
              )}
            </td>
            <td style={tdStyle}>{f.container ?? '—'}</td>
            <td style={tdStyle}>{f.node ?? '—'}</td>
            {bytesCell(f.bytesSent)}
            {bytesCell(f.bytesReceived)}
            <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt.num(f.connects)}</td>
            <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt.num(f.failedConnects)}</td>
            <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{fmt.time(f.firstSeenInWindow)}</td>
          </tr>
        ))}
      </tbody>
    </TableWrap>
  );
}

function EgressSection({
  result,
  status,
  range,
  fmt,
  t,
}: {
  result: NetmonResult<EgressTopResponse>;
  status: NetmonResult<{ collectors: CollectorStatus[] }>;
  range: NetworkRange;
  fmt: Formatters;
  t: Translate;
}) {
  let body: ReactNode;
  if (isNotDeployed(result)) {
    // data-service without the NM-2 read API (homelab-data-service#16).
    body = <p style={noteStyle}>{t('notYetAvailable', { subproject: 'NM-2' })}</p>;
  } else if (!result.ok) {
    body = <Failure result={result} t={t} />;
  } else if (result.data.items.length === 0) {
    // A plain empty success does not prove the node agent is missing, so
    // "no data yet" is claimed only per `hasNoSourceData` (never succeeded,
    // or succeeded with the `upstream` "no series" warning).
    const neverCollected = hasNoSourceData(status, 'egress');
    // A disabled collector explains the empty result itself; do not point
    // at the node agent then.
    const disabled = status.ok && status.data.collectors.some((c) => c.name === 'egress' && !c.enabled);
    body = neverCollected ? (
      <p role="status" style={noteStyle}>
        {t('egress.noDataYet')}
      </p>
    ) : (
      <>
        <p style={noteStyle}>{t('empty')}</p>
        <p style={noteStyle}>{t(disabled ? 'egress.disabledHint' : 'egress.emptyHint')}</p>
      </>
    );
  } else {
    const items = result.data.items;
    // Group per workload, largest total first; rows keep bytes order.
    const groups = new Map<string, { key: string; label: string; total: number; rows: EgressFlow[] }>();
    for (const f of items) {
      const key = workloadKey(f);
      const g = groups.get(key) ?? { key, label: workloadLabel(f, t), total: 0, rows: [] };
      g.total += flowBytes(f);
      g.rows.push(f);
      groups.set(key, g);
    }
    const sorted = [...groups.values()].sort((a, b) => b.total - a.total);
    for (const g of sorted) g.rows.sort((a, b) => flowBytes(b) - flowBytes(a));
    const sum = (k: 'bytesSent' | 'bytesReceived') => items.reduce((acc, f) => acc + (Number.isFinite(f[k]) ? f[k] : 0), 0);
    body = (
      <div style={{ display: 'grid', gap: '.75rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '.75rem' }}>
          <StatTile label={t('egress.flows')} value={fmt.num(items.length)} />
          <StatTile label={t('egress.newFlows')} value={fmt.num(items.filter((f) => f.isNew).length)} />
          <StatTile label={t('egress.bytesSent')} value={fmt.bytes(sum('bytesSent'))} />
          <StatTile label={t('egress.bytesReceived')} value={fmt.bytes(sum('bytesReceived'))} />
        </div>
        <p style={noteStyle}>{t('egress.fromListedRows', { count: items.length })}</p>
        <BarList
          title={t('egress.topWorkloads')}
          rows={sorted.slice(0, 10).map((g) => ({ key: g.key, label: g.label, value: g.total }))}
          fmt={{ ...fmt, num: fmt.bytes }}
          emptyText={t('empty')}
        />
        <p style={noteStyle}>{t('egress.note')}</p>
        {sorted.map((g, i) => (
          <SubBlock
            key={g.key}
            id={`netmon-egress-${i}`}
            title={g.label}
            aside={<span style={noteStyle}>{fmt.bytes(g.total)}</span>}
          >
            <EgressTable rows={g.rows} range={range} fmt={fmt} t={t} />
          </SubBlock>
        ))}
      </div>
    );
  }
  return (
    <Section id="netmon-egress" title={t('egress.title')}>
      <p style={{ fontSize: '.85rem', color: 'var(--n-60)', lineHeight: 1.5, maxWidth: '44rem' }}>{t('egress.subtitle')}</p>
      {body}
    </Section>
  );
}

// ── Shell ───────────────────────────────────────────────────────────────────

export async function NetworkShell({
  locale,
  range,
  ip,
  invalidIp,
  fwCursor,
  fwWindow,
}: {
  locale: Locale;
  range: NetworkRange;
  ip?: string;
  invalidIp: boolean;
  fwCursor?: string;
  /** Window pinned by a paging link; used only together with `fwCursor`. */
  fwWindow?: TimeWindow;
}) {
  const t = await getTranslations('dashboard.network');
  const fmt = makeFormatters(locale);
  const now = new Date();
  const pageWindow = toWindow(range, now);
  // The IP API defaults to 7 d (§7.2); a 24 h page window would hide most of
  // an IP's history, so the detail panel never looks back less than 7 d.
  const detailRange: NetworkRange = range === '24h' ? '7d' : range;

  // Older firewall pages keep the window of the page that issued the cursor,
  // so paging is deterministic instead of drifting with "now".
  const firewallWindow = fwCursor && fwWindow ? fwWindow : pageWindow;

  // Fetchers are designed never to throw (they return NetmonResult);
  // allSettled enforces that, so an unexpected rejection still becomes an
  // honest per-section "unavailable" state (§8).
  const settled = await Promise.allSettled([
    getStatus(),
    getInboundSummary(pageWindow),
    getFirewallEvents(firewallWindow, fwCursor),
    ip ? getIpDetail(ip, toWindow(detailRange, now)) : Promise.resolve(null),
    getLanConnections(pageWindow),
    getUfwBlocks(pageWindow),
    getSshAuth(pageWindow),
    getEgressTop(pageWindow),
  ] as const);
  const unreachable: NetmonFailure = { ok: false, kind: 'unreachable' };
  const status = settled[0].status === 'fulfilled' ? settled[0].value : unreachable;
  const summary = settled[1].status === 'fulfilled' ? settled[1].value : unreachable;
  const firewall = settled[2].status === 'fulfilled' ? settled[2].value : unreachable;
  const ipDetail = settled[3].status === 'fulfilled' ? settled[3].value : unreachable;
  const lanConnections = settled[4].status === 'fulfilled' ? settled[4].value : unreachable;
  const ufwBlocks = settled[5].status === 'fulfilled' ? settled[5].value : unreachable;
  const sshAuth = settled[6].status === 'fulfilled' ? settled[6].value : unreachable;
  const egressTop = settled[7].status === 'fulfilled' ? settled[7].value : unreachable;
  if (settled.some((r) => r.status === 'rejected')) console.warn('[netmon] a section fetch rejected unexpectedly');

  return (
    <div style={{ background: 'var(--n-10)' }}>
      {/* Header bar */}
      <div style={{ borderBottom: '1px solid rgba(162,167,176,.22)', background: 'var(--white)' }}>
        <div
          className="container border-x"
          style={{ padding: '1.5rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '.25rem' }}>
              <h1 style={{ ...monoKicker, fontWeight: 400 }}>{t('kicker')}</h1>
              <span style={privatePillStyle}>{t('adminOnly')}</span>
            </div>
            <p style={{ fontSize: '.9rem', color: 'var(--n-60)', lineHeight: 1.5, maxWidth: '44rem' }}>{t('subtitle')}</p>
          </div>
          <nav aria-label={t('window.label')} style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
            <span style={{ ...monoLabel, fontSize: '.62rem' }}>{t('window.label')}</span>
            {NETWORK_RANGES.map((r) => (
              <Link
                key={r}
                href={pageHref({ range: r, ip })}
                aria-current={r === range ? 'page' : undefined}
                style={{ ...chipBase, ...(r === range ? chipActive : {}) }}
              >
                {t(`window.${r}`)}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="container border-x">
        <StatusStrip result={status} fmt={fmt} t={t} />

        {(ip || invalidIp) && (
          <IpPanel ip={ip} invalidIp={invalidIp} result={ipDetail} range={range} detailRange={detailRange} fmt={fmt} t={t} />
        )}

        {/* Inbound (NM-1) */}
        <Section
          id="netmon-inbound"
          title={t('inbound.title')}
          aside={summary.ok && summary.data.totals.sampled ? <Tag>{t('sampled')}</Tag> : undefined}
        >
          {!summary.ok ? (
            <Failure result={summary} t={t} />
          ) : (
            <div style={{ display: 'grid', gap: '.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '.75rem' }}>
                <StatTile label={t('inbound.requests')} value={fmt.num(summary.data.totals.requests)} />
                <StatTile label={t('inbound.uniqueIps')} value={fmt.num(summary.data.totals.uniqueClientIps)} />
              </div>
              <Timeline points={summary.data.timeline} fmt={fmt} label={t('inbound.timeline')} />

              <p style={{ ...monoLabel, fontSize: '.62rem', marginTop: '.5rem' }}>{t('inbound.topIps')}</p>
              {summary.data.topClientIps.length === 0 ? (
                <p style={noteStyle}>{t('empty')}</p>
              ) : (
                <TableWrap>
                  <thead>
                    <tr>
                      <th style={thStyle}>{t('inbound.ip')}</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>{t('inbound.requests')}</th>
                      <th style={thStyle}>{t('inbound.country')}</th>
                      <th style={thStyle}>{t('inbound.asn')}</th>
                      <th style={thStyle}>{t('inbound.reputation')}</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>{t('inbound.firewallEvents')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.data.topClientIps.map((row) => (
                      <tr key={row.ip}>
                        <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                          <IpLink ip={row.ip} range={range} />
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt.num(row.requests)}</td>
                        <td style={tdStyle} title={fmt.country(row.country)}>
                          {row.country ?? '—'}
                        </td>
                        <td style={tdStyle}>{asnLabel(row.asn, row.asnOrg)}</td>
                        <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                          {row.blocklisted && <span style={flagStyle}>{t('inbound.blocklisted')}</span>}{' '}
                          {typeof row.abuseScore === 'number' && t('inbound.abuseScoreValue', { score: row.abuseScore })}
                          {!row.blocklisted && typeof row.abuseScore !== 'number' && '—'}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt.num(row.firewallEvents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </TableWrap>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '.75rem', marginTop: '.5rem' }}>
                <BarList
                  title={t('inbound.countries')}
                  rows={summary.data.topCountries.map((c, i) => ({ key: c.country ?? `unknown-${i}`, label: fmt.country(c.country), value: c.requests }))}
                  fmt={fmt}
                  emptyText={t('empty')}
                />
                <BarList
                  title={t('inbound.asns')}
                  rows={summary.data.topAsns.map((a, i) => ({ key: String(a.asn ?? `unknown-${i}`), label: asnLabel(a.asn, a.asnOrg), value: a.requests }))}
                  fmt={fmt}
                  emptyText={t('empty')}
                />
                <BarList
                  title={t('inbound.hosts')}
                  rows={summary.data.topHosts.map((h) => ({ key: h.host, label: h.host, value: h.requests }))}
                  fmt={fmt}
                  emptyText={t('empty')}
                />
                <BarList
                  title={t('inbound.paths')}
                  rows={summary.data.topPaths.map((p) => ({ key: `${p.host}${p.path}`, label: `${p.host}${p.path}`, value: p.requests }))}
                  fmt={fmt}
                  emptyText={t('empty')}
                />
                <BarList
                  title={t('inbound.statuses')}
                  rows={summary.data.statuses.map((s) => ({ key: String(s.status), label: String(s.status), value: s.requests }))}
                  fmt={fmt}
                  emptyText={t('empty')}
                />
              </div>
            </div>
          )}
        </Section>

        {/* Firewall events (NM-1) */}
        <Section id="netmon-firewall" title={t('inbound.firewall.title')}>
          {!firewall.ok ? (
            <Failure result={firewall} t={t} />
          ) : (
            <div style={{ display: 'grid', gap: '.75rem' }}>
              <FirewallTable items={firewall.data.items} range={range} fmt={fmt} t={t} />
              {(fwCursor || firewall.data.nextCursor) && (
                <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end' }}>
                  {fwCursor && (
                    <Link href={pageHref({ range, ip })} style={chipBase}>
                      {t('inbound.firewall.newest')}
                    </Link>
                  )}
                  {firewall.data.nextCursor && (
                    <Link
                      href={pageHref({ range, ip, fwCursor: firewall.data.nextCursor, fwWindow: firewallWindow })}
                      style={chipBase}
                    >
                      {t('inbound.firewall.older')}
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}
        </Section>

        {/* LAN (NM-3) */}
        <LanSection connections={lanConnections} ufw={ufwBlocks} ssh={sshAuth} status={status} range={range} fmt={fmt} t={t} />

        {/* Egress (NM-2) */}
        <EgressSection result={egressTop} status={status} range={range} fmt={fmt} t={t} />

        {/* Later sub-projects (§8): labelled placeholders, no data. */}
        <div style={{ padding: '1.5rem 0 2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '.75rem' }}>
          {([['logins', 'NM-4']] as const).map(([key, subproject]) => (
            <div key={key} style={{ ...cardStyle, borderStyle: 'dashed', background: 'transparent' }}>
              <p style={{ ...monoLabel, fontSize: '.62rem', marginBottom: '.35rem' }}>{t(`${key}.title`)}</p>
              <p style={noteStyle}>{t('notYetAvailable', { subproject })}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
