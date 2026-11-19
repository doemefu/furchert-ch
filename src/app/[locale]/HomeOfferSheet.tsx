// Home hero: one invented example sheet (an enquiry becomes a draft quote),
// laid out as a «Formular» sheet: label line and title, then one labelled
// field per step (FieldList/FieldRow, redesign PR 7). Data comes from the
// /automation 'offerte' tile (read-only), so /automation stays untouched. No
// prices, no motion, no link (#178). The position list is a real <table> with
// column headers: it is tabular data (number, item, quantity), a screen reader
// then announces «row 2 of 4, quantity ...», which a plain list cannot do.
import { getTranslations } from 'next-intl/server';
import { FieldList, FieldRow } from '@/components/ui/FieldRow';
import { WOW_TILES, type WowTile } from '@/data/automation-wow';
import type { Locale } from '@/i18n/routing';

type OfferTile = Extract<WowTile, { id: 'offerte' }>;
const isOffer = (tile: WowTile): tile is OfferTile => tile.id === 'offerte';

export async function HomeOfferSheet({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'pages.home' });
  const tile = WOW_TILES.find(isOffer);
  if (!tile) return null;
  const p = tile.i18n[locale].panel;
  const [itemCol, quantityCol] = p.table.columns;
  // Every row carries the same price phrase; it is shown once, under the table.
  const priceNote = p.table.rows[0]?.[2] ?? '';

  return (
    <figure className="hs">
      <figcaption className="hs-cap">
        <span className="hs-lab">{t('sheetTag')}</span>
        <span className="hs-title">{t('sheetTitle')}</span>
      </figcaption>
      <div className="hs-sheet" role="group" aria-label={t('sheetAlt')}>
        <FieldList>
          <FieldRow variant="text" label={t('sheetRowMail')} meta={p.mailFrom}>
            {p.mailSubject}
          </FieldRow>
          <FieldRow variant="text" label={p.foundTag}>
            <mark className="hs-see">{p.foundText}</mark>
          </FieldRow>
          <FieldRow variant="text" label={p.table.caption}>
            <table className="hs-pos">
              <caption className="sr-only">{p.table.caption}</caption>
              <thead>
                <tr>
                  <th scope="col">{t('sheetPosNo')}</th>
                  <th scope="col">{itemCol}</th>
                  <th scope="col">{quantityCol}</th>
                </tr>
              </thead>
              <tbody>
                {p.table.rows.map(([item, quantity], i) => (
                  <tr key={item}>
                    <td>{i + 1}</td>
                    <td>{item}</td>
                    <td>{quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {priceNote ? <p className="hs-price">{t('sheetPrices', { note: priceNote })}</p> : null}
          </FieldRow>
          <FieldRow variant="text" label={p.questionsLabel}>
            <ul className="hs-ask">
              {p.questions.map((q) => (
                <li key={q}>
                  <mark>{q}</mark>
                </li>
              ))}
            </ul>
          </FieldRow>
        </FieldList>
        <p className="hs-close">{p.closing}</p>
      </div>
    </figure>
  );
}
