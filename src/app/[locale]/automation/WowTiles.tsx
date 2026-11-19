// The three example tiles of the /automation hero (src/data/automation-wow.ts).
// Illustrative only: no recording, no upload, no AI call; the examples are
// invented and say so. Server component, no client JS: each tile is a native
// <details> (no `name`, so tiles open and close independently). The
// <summary> holds phrasing content only. All motion lives in the "WOW TILES"
// block of globals.css (opacity/transform and one SVG dash, only when a tile
// opens, none with reduced motion); nothing here sets an inline animation,
// transition or transform. Looks as a «Formular» sheet (redesign PR 7b/11):
// FieldList/FieldRow rows, highlighter marks (`mark`, `mark.hs-see`) instead of
// coloured edges, 1px ink border with --radius; the `.wt-*` styles live in
// globals.css.
import type { CSSProperties, ReactNode } from 'react';
import { FieldList, FieldRow } from '@/components/ui/FieldRow';
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
import { trackAttr } from '@/data/track-ids';

// Panel steps fade in one after another (`--i` sets the delay in CSS).
const step = (i: number): CSSProperties => ({ ['--i' as string]: i }) as CSSProperties;

function Step({ i, children, className }: { i: number; children: ReactNode; className?: string }) {
  return (
    <div className={className ? `wow-step ${className}` : 'wow-step'} style={step(i)}>
      {children}
    </div>
  );
}

function RapportBody({ p }: { p: RapportPanel }) {
  return (
    <>
      <Step i={0}>
        <p className="wt-speech">
          <Icon name="mic" size={14} />
          {p.speechLabel}
          <span aria-hidden="true" className="wt-bars">
            {[0.5, 1, 0.7, 0.9, 0.4].map((h, b) => (
              <span
                key={b}
                className="wow-bar"
                style={{ ['--b' as string]: b, height: `${h * 12}px` } as CSSProperties}
              />
            ))}
          </span>
        </p>
        <p lang="de-CH" className="wt-spoken">
          {p.spoken}
        </p>
      </Step>
      <Step i={1} className="wt-div">
        {p.divider}
      </Step>
      <FieldList className="wt-sheet">
        {p.rows.map((row, r) => (
          <FieldRow key={row.label} variant="text" label={row.label} className="wow-step" style={step(r + 2)}>
            {row.value}
          </FieldRow>
        ))}
        <FieldRow variant="text" label={p.openItem.label} className="wow-step" style={step(p.rows.length + 2)}>
          <mark>{p.openItem.value}</mark>
        </FieldRow>
      </FieldList>
      <p className="wt-note">{p.note}</p>
    </>
  );
}

function OfferBody({ p }: { p: OfferPanel }) {
  return (
    <>
      <Step i={0} className="wt-mail">
        <p className="wt-mail-from">
          <Icon name="mail" size={14} />
          {p.mailFrom}
        </p>
        <p className="wt-mail-subject">{p.mailSubject}</p>
      </Step>
      <FieldList className="wt-sheet">
        <FieldRow variant="text" label={p.foundTag} secondary={p.memory} className="wow-step" style={step(1)}>
          <mark className="hs-see">{p.foundText}</mark>
        </FieldRow>
        <FieldRow variant="text" label={p.table.caption} className="wow-step" style={step(2)}>
          <table className="wt-tab" role="table">
            <caption className="sr-only">{p.table.caption}</caption>
            <thead role="rowgroup">
              <tr role="row">
                {p.table.columns.map((c) => (
                  <th key={c} scope="col" role="columnheader">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody role="rowgroup">
              {p.table.rows.map(([item, qty, price]) => (
                <tr key={item} role="row">
                  <th scope="row" role="rowheader">{item}</th>
                  <td role="cell">{qty}</td>
                  <td role="cell">{price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </FieldRow>
        <FieldRow variant="text" label={p.questionsLabel} className="wow-step" style={step(3)}>
          <ul role="list" className="hs-ask">
            {p.questions.map((q) => (
              <li key={q}>
                <mark>{q}</mark>
              </li>
            ))}
          </ul>
        </FieldRow>
        <FieldRow variant="text" label={p.reservationLabel} className="wow-step" style={step(3)}>
          {p.reservation}
        </FieldRow>
      </FieldList>
      <p className="wt-close">{p.closing}</p>
      <p className="wt-note">{p.footnote}</p>
    </>
  );
}

function OverviewBody({ p }: { p: OverviewPanel }) {
  return (
    <>
      <Step i={0} className="wt-src">
        {p.sources.map((s) => (
          <Tag key={s}>{s}</Tag>
        ))}
      </Step>
      <svg
        className="wow-line"
        aria-hidden="true"
        viewBox="0 0 100 24"
        preserveAspectRatio="none"
        style={{ display: 'block', width: '100%', height: 16 }}
      >
        <path
          d="M10 0 C10 14 50 8 50 24 M50 0 L50 24 M90 0 C90 14 50 8 50 24"
          pathLength="1"
          fill="none"
          stroke="var(--text-3)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <Step i={1} className="wt-card">
        <p className="wt-card-h">
          <span>{p.cardTitle}</span>
          <span>{p.cardTime}</span>
        </p>
        <p className="wt-greet">{p.greeting}</p>
        <ul role="list" className="wt-items">
          {p.items.map((item, n) => (
            <li key={item.label} className="wow-step" style={step(n + 2)}>
              <b>{item.label}</b> {item.value}
            </li>
          ))}
        </ul>
        <p className="wt-close wt-card-close">{p.closing}</p>
      </Step>
      <p className="wt-note">{p.footnote}</p>
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
        padding: '0 .75rem',
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
            <details className="wow wt">
              <summary className="wt-sum">
                <span className="wt-title">
                  <Icon name={tile.icon} size={16} />
                  {c.title}
                </span>
                <span className="wt-body">{c.body}</span>
                <span className="wt-foot">
                  <Tag blue={own}>{c.kindLabel}</Tag>
                  <span className="wt-toggle">
                    <span className="wow-when-closed">
                      {t('heroTileOpen')} <span aria-hidden="true">+</span>
                    </span>
                    <span className="wow-when-open">
                      {t('heroTileClose')} <span aria-hidden="true">×</span>
                    </span>
                  </span>
                </span>
              </summary>
              <div className="wt-panel">
                <p className="wt-ptag">
                  <Tag blue={own}>{c.panelTag}</Tag>
                </p>
                <PanelBody tile={tile} locale={locale} />
                <p className="wt-links">
                  {tile.id === 'rapport' && (
                    <a href="#beispiel" className="text-link text-link-block" data-track={trackAttr('link', 'automation-tile-example')}>
                      {tile.i18n[locale].panel.exampleLink}
                    </a>
                  )}
                  <Link
                    href={contactHref(`automation-tile-${tile.id}`)}
                    className="text-link text-link-block"
                    data-track={trackAttr('cta', `automation-tile-${tile.id}`)}
                  >
                    {own ? t('heroTileCtaSimilar') : t('heroTileCta')}
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
