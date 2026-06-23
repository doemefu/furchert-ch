// Ported verbatim from the prototype (shared.jsx StatusDot).
// Colours via --status-* design tokens (globals.css).
export type DotStatus = 'online' | 'wip' | 'repo';

// Single source for status→colour, also consumed by AppGrid's status text
// so the dot and its label can never drift apart.
export const STATUS_COLOR: Record<DotStatus, string> = {
  online: 'var(--status-online)',
  wip: 'var(--status-wip)',
  repo: 'var(--status-repo)',
};

// `label` makes the dot non-decorative for screen readers (role="img").
// Pass it where the status is conveyed by colour alone (e.g. cluster nodes);
// omit it where adjacent visible text already names the status.
export function StatusDot({ status, label }: { status: DotStatus; label?: string }) {
  return (
    <span
      {...(label ? { role: 'img', 'aria-label': label } : {})}
      style={{
        display: 'inline-block',
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: STATUS_COLOR[status],
        flexShrink: 0,
      }}
    />
  );
}
