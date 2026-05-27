// Ported verbatim from the prototype (shared.jsx StatusDot).
// Colours via --status-* design tokens (globals.css).
export function StatusDot({ status }: { status: string }) {
  const color =
    status === 'online'
      ? 'var(--status-online)'
      : status === 'wip'
        ? 'var(--status-wip)'
        : 'var(--status-repo)';
  return (
    <span
      style={{
        display: 'inline-block',
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: color,
        flexShrink: 0,
      }}
    />
  );
}
