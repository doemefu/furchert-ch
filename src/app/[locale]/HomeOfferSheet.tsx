// Home hero: one invented example sheet (an enquiry becomes a draft quote).
// Data comes from the /automation 'offerte' tile (read-only); the styles are
// duplicated here on purpose so /automation stays untouched. No prices, no
// motion, no link (#178).
import type { CSSProperties } from 'react';
import { getTranslations } from 'next-intl/server';
import { WOW_TILES, type WowTile } from '@/data/automation-wow';
import type { Locale } from '@/i18n/routing';

const HAIRLINE = '1px solid rgba(162,167,176,.22)';

const AMBER: CSSProperties = {
  display: 'block',
  padding: '2px .5rem',
  fontSize: 'var(--fs-13)',
  color: 'var(--n-80)',
  background: 'color-mix(in srgb, var(--tier-mid) 16%, var(--white))',
  borderLeft: '2px solid var(--tier-mid)',
};

const smallLabel: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 'var(--fs-12)',
  color: 'var(--n-60)',
  letterSpacing: 0,
};

const cell: CSSProperties = { padding: '.5rem .5rem', textAlign: 'left', verticalAlign: 'top', borderBottom: HAIRLINE };

type OfferTile = Extract<WowTile, { id: 'offerte' }>;
const isOffer = (tile: WowTile): tile is OfferTile => tile.id === 'offerte';

export async function HomeOfferSheet({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'pages.home' });
  const tile = WOW_TILES.find(isOffer);
  if (!tile) return null;
  const p = tile.i18n[locale].panel;

  return (
    <figure
      style={{
        margin: 0,
        background: 'var(--white)',
        border: HAIRLINE,
        borderRadius: 2,
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      <figcaption style={{ display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
        <span style={smallLabel}>{t('sheetTag')}</span>
        <span style={{ fontSize: 'var(--fs-16)', fontWeight: 500, color: 'var(--n-100)', lineHeight: 1.3 }}>
          {t('sheetTitle')}
        </span>
      </figcaption>
      <div
        role="group"
        aria-label={t('sheetAlt')}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        <div style={{ border: HAIRLINE, background: 'var(--white)', padding: '.75rem' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 'var(--fs-12)', color: 'var(--n-60)' }}>{p.mailFrom}</div>
          <div style={{ fontSize: 'var(--fs-14)', color: 'var(--n-80)', marginTop: '.25rem', lineHeight: 1.4 }}>
            {p.mailSubject}
          </div>
        </div>
        <div>
          <div style={smallLabel}>{p.foundTag}</div>
          <div style={{ fontSize: 'var(--fs-14)', color: 'var(--n-100)', marginTop: '.25rem' }}>{p.foundText}</div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-13)', color: 'var(--n-80)' }}>
          <caption style={{ ...smallLabel, textAlign: 'left', paddingBottom: '.25rem' }}>{p.table.caption}</caption>
          <thead>
            <tr>
              {p.table.columns.map((c) => (
                <th key={c} scope="col" style={{ ...cell, ...smallLabel, fontWeight: 400 }}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {p.table.rows.map((row, i) => (
              <tr key={row[0]} className={i >= 2 ? 'home-sheet-extra' : undefined}>
                {row.map((c, j) => (
                  <td key={j} style={cell}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div>
          <div style={smallLabel}>{p.questionsLabel}</div>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '.25rem', marginTop: '.25rem' }}>
            {p.questions.map((q) => (
              <li key={q} style={AMBER}>
                {q}
              </li>
            ))}
          </ul>
        </div>
        <p style={{ fontSize: 'var(--fs-14)', color: 'var(--n-70)', lineHeight: 1.5 }}>{p.closing}</p>
      </div>
    </figure>
  );
}
