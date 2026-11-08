// Ported verbatim from the prototype (shared.jsx StatusDot).
// Colours via --status-* design tokens (globals.css).
export type DotStatus = 'online' | 'wip' | 'repo' | 'offline' | 'unknown';

// Single source for status→dot colour.
export const STATUS_COLOR: Record<DotStatus, string> = {
  online: 'var(--status-online)',
  wip: 'var(--status-wip)',
  repo: 'var(--status-repo)',
  offline: 'var(--status-offline)',
  unknown: 'var(--status-unknown)',
};

// Text colour for a status label: the dot tones only meet 3:1, text needs 4.5:1 (#151).
export const STATUS_INK: Record<DotStatus, string> = {
  online: 'var(--status-online-ink)',
  wip: 'var(--status-wip-ink)',
  repo: 'var(--n-60)',
  offline: 'var(--status-offline-ink)',
  unknown: 'var(--n-60)',
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
