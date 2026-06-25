// Ported verbatim from the prototype (shared.jsx Ticker). Presentational only.
import { TICKER_ITEMS } from '@/data/ticker';

export function Ticker() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div
      // Decorative scrolling marquee with a duplicated track for the loop —
      // hidden from assistive tech so the content isn't announced twice.
      aria-hidden="true"
      style={{
        overflow: 'hidden',
        borderTop: '1px solid rgba(162,167,176,.22)',
        padding: '.875rem 0',
        background: 'var(--n-100)',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: '3rem',
          whiteSpace: 'nowrap',
          animation: 'ticker 22s linear infinite',
        }}
      >
        {items.map((item, i) => (
          <span
            key={i}
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '.8125rem',
              letterSpacing: '.06em',
              textTransform: 'uppercase',
              color: 'var(--n-50)',
              flexShrink: 0,
            }}
          >
            <span style={{ color: 'var(--n-30)', marginRight: '3rem' }}>●</span>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
