// The three example tiles of the /automation hero (src/data/automation-wow.ts).
// Illustrative only: no recording, no upload, no AI call; the examples are
// invented and say so. Server component, no client JS: each tile is a native
// <details> (no `name`, so tiles open and close independently). The
// <summary> holds phrasing content only. All motion lives in the "WOW TILES"
// block of globals.css (opacity/transform and one SVG dash, only when a tile
// opens, none with reduced motion); nothing here sets an inline animation,
// transition or transform.
import type { CSSProperties, ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/ui/Icon';
import { Tag } from '@/components/ui/Tag';
import { contactHref } from '@/data/contact-sources';
import {
  WOW_TILES,
  type OfferPanel,
  type OverviewPanel,
  type RapportPanel,
  type WowTile,
} from '@/data/automation-wow';
import { HAIRLINE, fieldLabel, footnoteStyle, textLink } from './sectionStyles';
import { trackAttr } from '@/data/track-ids';

// Panel steps fade in one after another (`--i` sets the delay in CSS).
const step = (i: number): CSSProperties => ({ ['--i' as string]: i }) as CSSProperties;

const AMBER: CSSProperties = {
  display: 'block',
  padding: '2px .5rem',
  fontSize: 'var(--fs-13)',
  color: 'var(--n-80)',
  background: 'color-mix(in srgb, var(--tier-mid) 16%, var(--white))',
  borderLeft: '2px solid var(--tier-mid)',
};

const smallText: CSSProperties = { fontSize: 'var(--fs-14)', color: 'var(--n-70)', lineHeight: 1.5 };

function Step({ i, children, style }: { i: number; children: ReactNode; style?: CSSProperties }) {
  return (
    <div className="wow-step" style={{ ...step(i), ...style }}>
      {children}
    </div>
  );
}

function RapportBody({ p }: { p: RapportPanel }) {
  return (
    <>
      <Step i={0}>
        <p style={{ ...fieldLabel, display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.5rem' }}>
          <Icon name="mic" size={14} />
          {p.speechLabel}
          <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 2, height: 12 }}>
            {[0.5, 1, 0.7, 0.9, 0.4].map((h, b) => (
              <span
                key={b}
                className="wow-bar"
                style={{ ['--b' as string]: b, display: 'block', width: 2, height: `${h * 12}px`, background: 'var(--blue-base)' } as CSSProperties}
              />
            ))}
          </span>
        </p>
        <p lang="de-CH" style={{ fontSize: 'var(--fs-15)', lineHeight: 1.55, color: 'var(--n-80)', fontStyle: 'italic' }}>
          {p.spoken}
        </p>
      </Step>
      <Step i={1} style={{ ...fieldLabel, textTransform: 'none', letterSpacing: 0, color: 'var(--blue-base)', margin: '1rem 0 .25rem' }}>
        <span aria-hidden="true">↓</span> {p.divider}
      </Step>
      <dl style={{ margin: 0 }}>
        {p.rows.map((row, r) => (
          <Step
            key={row.label}
            i={r + 2}
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(5rem, 30%) 1fr',
              gap: '.75rem',
              padding: '.5rem 0',
              borderTop: '1px solid rgba(14,60,166,.1)',
            }}
          >
            <dt style={{ ...fieldLabel, paddingTop: '2px' }}>{row.label}</dt>
            <dd style={{ margin: 0, ...smallText, color: 'var(--n-80)' }}>{row.value}</dd>
          </Step>
        ))}
        <Step
          i={p.rows.length + 2}
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(5rem, 30%) 1fr',
            gap: '.75rem',
            padding: '.5rem 0',
            borderTop: '1px solid rgba(14,60,166,.1)',
          }}
        >
          <dt style={{ ...fieldLabel, paddingTop: '2px' }}>{p.openItem.label}</dt>
          <dd style={{ margin: 0 }}>
            <span style={AMBER}>{p.openItem.value}</span>
          </dd>
        </Step>
      </dl>
      <p style={{ ...footnoteStyle, marginTop: '1rem' }}>{p.note}</p>
    </>
  );
}

function OfferBody({ p }: { p: OfferPanel }) {
  const cell: CSSProperties = { padding: '.5rem .5rem .5rem 0', textAlign: 'left', verticalAlign: 'top' };
  return (
    <>
      <Step i={0} style={{ padding: '.75rem', background: 'var(--white)', border: HAIRLINE, borderRadius: 2 }}>
        <p style={{ ...smallText, display: 'flex', alignItems: 'center', gap: '.5rem' }}>
          <Icon name="mail" size={14} />
          {p.mailFrom}
        </p>
        <p style={{ ...smallText, color: 'var(--n-100)', fontWeight: 500, marginTop: '2px' }}>{p.mailSubject}</p>
      </Step>
      <Step i={1} style={{ marginTop: '1rem' }}>
        <p style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '.5rem', ...smallText }}>
          <Tag blue>{p.foundTag}</Tag>
          <span>{p.foundText}</span>
        </p>
        <p style={{ ...smallText, marginTop: '.5rem' }}>{p.memory}</p>
      </Step>
      <Step i={2} style={{ marginTop: '1rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-13)', color: 'var(--n-80)' }}>
          <caption style={{ ...fieldLabel, textAlign: 'left', marginBottom: '.25rem' }}>{p.table.caption}</caption>
          <thead>
            <tr style={{ borderBottom: HAIRLINE }}>
              {p.table.columns.map((c) => (
                <th key={c} scope="col" style={{ ...cell, ...fieldLabel, fontWeight: 400 }}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {p.table.rows.map(([item, qty, price]) => (
              <tr key={item} style={{ borderBottom: '1px solid rgba(162,167,176,.12)' }}>
                <th scope="row" style={{ ...cell, fontWeight: 400 }}>
                  {item}
                </th>
                <td style={cell}>{qty}</td>
                <td style={{ ...cell, color: 'var(--n-60)' }}>{price}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Step>
      <Step i={3} style={{ marginTop: '1rem', display: 'grid', gap: '.5rem' }}>
        <div>
          <p style={{ ...fieldLabel, marginBottom: '.25rem' }}>{p.questionsLabel}</p>
          <ul role="list" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '.25rem' }}>
            {p.questions.map((q) => (
              <li key={q} style={AMBER}>
                {q}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p style={{ ...fieldLabel, marginBottom: '.25rem' }}>{p.reservationLabel}</p>
          <p style={smallText}>{p.reservation}</p>
        </div>
      </Step>
      <p style={{ ...smallText, color: 'var(--n-100)', marginTop: '1rem' }}>{p.closing}</p>
      <p style={{ ...footnoteStyle, marginTop: '.75rem' }}>{p.footnote}</p>
    </>
  );
}

function OverviewBody({ p }: { p: OverviewPanel }) {
  return (
    <>
      <Step i={0} style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}>
        {p.sources.map((s) => (
          <Tag key={s} contrast>
            {s}
          </Tag>
        ))}
      </Step>
      <svg
        className="wow-line"
        aria-hidden="true"
        viewBox="0 0 100 24"
        preserveAspectRatio="none"
        style={{ display: 'block', width: '100%', height: 24 }}
      >
        <path
          d="M10 0 C10 14 50 8 50 24 M50 0 L50 24 M90 0 C90 14 50 8 50 24"
          pathLength="1"
          fill="none"
          stroke="var(--blue-light)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <Step
        i={1}
        style={{ background: 'var(--blue-dark)', color: 'var(--white)', padding: '1rem', borderRadius: 2 }}
      >
        <p
          style={{
            ...fieldLabel,
            color: 'var(--n-20)',
            display: 'flex',
            justifyContent: 'space-between',
            gap: '.5rem',
            marginBottom: '.75rem',
          }}
        >
          <span>{p.cardTitle}</span>
          <span>{p.cardTime}</span>
        </p>
        <p style={{ fontSize: 'var(--fs-15)', fontWeight: 500, marginBottom: '.5rem' }}>{p.greeting}</p>
        <ul role="list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {p.items.map((item, n) => (
            <li
              key={item.label}
              className="wow-step"
              style={{
                ...step(n + 2),
                padding: '.5rem 0',
                borderTop: '1px solid rgba(255,255,255,.12)',
                fontSize: 'var(--fs-14)',
                lineHeight: 1.5,
                color: 'var(--n-20)',
              }}
            >
              <span style={{ color: 'var(--blue-wash)', fontWeight: 500 }}>{item.label}</span> {item.value}
            </li>
          ))}
        </ul>
        <p style={{ fontSize: 'var(--fs-14)', color: 'var(--white)', marginTop: '.5rem' }}>{p.closing}</p>
      </Step>
      <p style={{ ...footnoteStyle, marginTop: '.75rem' }}>{p.footnote}</p>
    </>
  );
}

function PanelBody({ tile, locale }: { tile: WowTile; locale: Locale }) {
  switch (tile.id) {
    case 'rapport':
      return <RapportBody p={tile.i18n[locale].panel} />;
    case 'offerte':
      return <OfferBody p={tile.i18n[locale].panel} />;
    case 'uebersicht':
      return <OverviewBody p={tile.i18n[locale].panel} />;
  }
}

export async function WowTiles({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'pages.automation' });

  return (
    <ul
      role="list"
      style={{
        listStyle: 'none',
        padding: 0,
        margin: 0,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 18rem), 1fr))',
        gap: '.75rem',
        alignItems: 'start',
      }}
    >
      {WOW_TILES.map((tile) => {
        const c = tile.i18n[locale];
        const own = tile.kind === 'own';
        return (
          <li key={tile.id}>
            <details
              className="wow"
              style={{
                background: own ? 'var(--blue-wash)' : 'var(--white)',
                border: own ? '1px solid rgba(14,60,166,.2)' : HAIRLINE,
                borderRadius: 2,
              }}
            >
              <summary style={{ display: 'block', padding: '.875rem 1rem' }}>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '.5rem',
                    fontFamily: 'var(--sans)',
                    fontSize: 'var(--fs-18)',
                    fontWeight: 500,
                    letterSpacing: 0,
                    color: 'var(--n-100)',
                  }}
                >
                  <span style={{ color: 'var(--blue-base)' }}>
                    <Icon name={tile.icon} size={16} />
                  </span>
                  {c.title}
                </span>
                <span
                  style={{
                    display: 'block',
                    margin: '.25rem 0 .625rem',
                    fontSize: 'var(--fs-15)',
                    lineHeight: 1.45,
                    color: 'var(--n-70)',
                  }}
                >
                  {c.body}
                </span>
                <span
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '.5rem',
                  }}
                >
                  <Tag blue={own} contrast>
                    {c.kindLabel}
                  </Tag>
                  <span
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: 'var(--fs-12)',
                      letterSpacing: '.05em',
                      textTransform: 'uppercase',
                      color: 'var(--blue-base)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span className="wow-when-closed">
                      {t('heroTileOpen')} <span aria-hidden="true">+</span>
                    </span>
                    <span className="wow-when-open">
                      {t('heroTileClose')} <span aria-hidden="true">×</span>
                    </span>
                  </span>
                </span>
              </summary>
              <div style={{ padding: '0 1rem 1rem', borderTop: HAIRLINE }}>
                <p style={{ margin: '1rem 0' }}>
                  <Tag blue={own} contrast>
                    {c.panelTag}
                  </Tag>
                </p>
                <PanelBody tile={tile} locale={locale} />
                <p style={{ display: 'flex', flexWrap: 'wrap', columnGap: '1.25rem', marginTop: '.5rem' }}>
                  {tile.id === 'rapport' && (
                    <a href="#beispiel" style={textLink} data-track={trackAttr('link', 'automation-tile-example')}>
                      {tile.i18n[locale].panel.exampleLink}
                    </a>
                  )}
                  <Link
                    href={contactHref(`automation-tile-${tile.id}`)}
                    style={textLink}
                    data-track={trackAttr('cta', `automation-tile-${tile.id}`)}
                  >
                    {own ? t('heroTileCtaSimilar') : t('heroTileCta')} <Icon name="arrow" size={10} />
                  </Link>
                </p>
              </div>
            </details>
          </li>
        );
      })}
    </ul>
  );
}
