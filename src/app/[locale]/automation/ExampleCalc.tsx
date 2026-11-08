// Sample calculation under the /automation example (src/data/automation-calc.ts):
// a plain three-column table at every width (it fits at 320 px), the results
// as short paragraphs, then a text link to the contact page. Server
// component, rendered inside AutomationExample as `children`. Invented
// numbers, labelled as assumptions; time value and costs stay side by side.
import type { Locale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { CALC } from '@/data/automation-calc';
import { contactHref } from '@/data/contact-sources';
import { HAIRLINE, bodyText, cardTitle, fieldLabel, footnoteStyle, textLink } from './sectionStyles';

export function ExampleCalc({ locale }: { locale: Locale }) {
  const c = CALC.i18n[locale];
  const cell = { padding: '.5rem .75rem .5rem 0', verticalAlign: 'top' as const };
  const num = { ...cell, textAlign: 'right' as const, whiteSpace: 'nowrap' as const, paddingRight: 0, paddingLeft: '.75rem', fontVariantNumeric: 'tabular-nums' };

  return (
    <div
      style={{
        marginTop: 'clamp(1.5rem, 5vw, 2.5rem)',
        paddingTop: 'clamp(1.5rem, 4vw, 2rem)',
        borderTop: HAIRLINE,
      }}
    >
      <table style={{ width: '100%', maxWidth: '40rem', borderCollapse: 'collapse', ...bodyText }}>
        <caption style={{ ...cardTitle, textAlign: 'left', marginBottom: '.5rem' }}>{c.title}</caption>
        <thead>
          <tr style={{ borderBottom: HAIRLINE }}>
            <th scope="col" style={{ ...cell, ...fieldLabel, fontWeight: 400, textAlign: 'left' }}>
              {c.columns[0]}
            </th>
            <th scope="col" style={{ ...num, ...fieldLabel, fontWeight: 400 }}>
              {c.columns[1]}
            </th>
            <th scope="col" style={{ ...num, ...fieldLabel, fontWeight: 400 }}>
              {c.columns[2]}
            </th>
          </tr>
        </thead>
        <tbody>
          {c.rows.map((row) => (
            <tr key={row.label} style={{ borderBottom: '1px solid rgba(162,167,176,.12)' }}>
              <th scope="row" style={{ ...cell, fontWeight: 400, textAlign: 'left' }}>
                {row.label}
              </th>
              <td style={num}>{row.today}</td>
              <td style={{ ...num, color: 'var(--blue-base)' }}>{row.byVoice}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ ...footnoteStyle, marginTop: '.75rem' }}>{c.assumptions}</p>
      <div style={{ marginTop: '1rem', display: 'grid', gap: '.6rem', maxWidth: '68ch' }}>
        {c.results.map((r) => (
          <p key={r} style={bodyText}>
            {r}
          </p>
        ))}
      </div>
      <p style={{ ...footnoteStyle, marginTop: '1rem' }}>{c.note}</p>
      <div data-cta="example" style={{ marginTop: '.5rem' }}>
        <Link href={contactHref('automation-example')} style={textLink}>
          {c.cta}
        </Link>
      </div>
    </div>
  );
}
