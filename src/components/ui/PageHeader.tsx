// Ported verbatim from the prototype (shared.jsx PageHeader).
export function PageHeader({
  label,
  title,
  sub,
}: {
  label?: string;
  title: string;
  sub?: string;
}) {
  return (
    <div style={{ padding: '5rem 0 3.5rem', borderBottom: '1px solid rgba(162,167,176,.22)' }}>
      {label && (
        <p
          style={{
            fontFamily: 'var(--mono)',
            fontSize: '.8125rem',
            letterSpacing: '.06em',
            textTransform: 'uppercase',
            color: 'var(--n-50)',
            marginBottom: '1rem',
          }}
        >
          {label}
        </p>
      )}
      <h1
        style={{
          fontFamily: 'var(--sans)',
          fontSize: 'clamp(2rem, 5vw, 3.375rem)',
          fontWeight: 500,
          letterSpacing: '-.03em',
          lineHeight: 1.09,
          maxWidth: '22ch',
          color: 'var(--n-100)',
          textWrap: 'balance',
        }}
      >
        {title}
      </h1>
      {sub && (
        <p
          style={{
            marginTop: '1.25rem',
            fontSize: 'clamp(1rem, 1.4vw, 1.25rem)',
            color: 'var(--n-60)',
            maxWidth: '58ch',
            lineHeight: 1.4,
            letterSpacing: '-.01em',
            textWrap: 'balance',
          }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
