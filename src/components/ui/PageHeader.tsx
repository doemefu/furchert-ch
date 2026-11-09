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
            fontSize: 'var(--fs-13)',
            letterSpacing: '.04em',
            textTransform: 'uppercase',
            color: 'var(--n-60)',
            marginBottom: '1rem',
          }}
        >
          {label}
        </p>
      )}
      <h1
        style={{
          fontFamily: 'var(--sans)',
          fontSize: 'var(--fs-title)',
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
            fontSize: 'var(--fs-lead)',
            color: 'var(--n-60)',
            maxWidth: '58ch',
            lineHeight: 1.4,
            letterSpacing: 0,
            textWrap: 'balance',
          }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
