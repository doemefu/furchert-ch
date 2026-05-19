// Ported verbatim from the prototype (shared.jsx StatusDot).
export function StatusDot({ status }: { status: string }) {
  const color =
    status === 'online' ? '#22c55e' : status === 'wip' ? '#f59e0b' : '#94a3b8';
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
