// From the prototype (shared.jsx StatusDot); square LED since unslop B2 (#177).
// Colours via --status-* design tokens (globals.css).
import type { ReactNode } from 'react';

export type DotStatus = 'online' | 'wip' | 'repo' | 'offline' | 'unknown';

// Single source for status→dot colour.
const STATUS_COLOR: Record<DotStatus, string> = {
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

// Square 8x8 LED: the status signature (#177). `label` makes the dot non-decorative for screen readers (role="img").
// Pass it where the status is conveyed by colour alone (e.g. cluster nodes);
// omit it where adjacent visible text already names the status.
export function StatusDot({ status, label }: { status: DotStatus; label?: string }) {
  return (
    <span
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: 0,
        background: STATUS_COLOR[status],
        flexShrink: 0,
      }}
    />
  );
}

// LED plus the status text. The LED is decorative; the text names the status.
export function StatusLabel({ status, children }: { status: DotStatus; children: ReactNode }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem' }}>
      <StatusDot status={status} />
      <span
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 'var(--fs-12)',
          letterSpacing: 0,
          color: STATUS_INK[status],
          whiteSpace: 'nowrap',
        }}
      >
        {children}
      </span>
    </span>
  );
}
