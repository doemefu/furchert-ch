// From the prototype (shared.jsx StatusDot); square LED since unslop B2 (#177).
// Colours via --status-* design tokens (globals.css).
import type { ReactNode } from 'react';

export type DotStatus = 'online' | 'wip' | 'repo' | 'offline' | 'unknown';

// Colours live in globals.css: `.led[data-status]` (the LED) and `.led-text[data-status]`
// (the label, which needs 4.5:1 while the LED only needs 3:1). Public pages use the
// redesign status tokens; `.ethon` (the dashboard) keeps the legacy --status-* tones.

// Square 8x8 LED: the status signature (#177). `label` makes the dot non-decorative for screen readers (role="img").
// Pass it where the status is conveyed by colour alone (e.g. cluster nodes);
// omit it where adjacent visible text already names the status.
export function StatusDot({ status, label }: { status: DotStatus; label?: string }) {
  return (
    <span
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      className="led"
      data-status={status}
    />
  );
}

// LED plus the status text. The LED is decorative; the text names the status.
// `onDark` is for dark bands: the label uses --n-20 for every status; the LED keeps its dot colour.
export function StatusLabel({
  status,
  onDark = false,
  children,
}: {
  status: DotStatus;
  onDark?: boolean;
  children: ReactNode;
}) {
  return (
    <span className="led-label">
      <StatusDot status={status} />
      <span className="led-text" data-status={status} data-on-dark={onDark ? '' : undefined}>
        {children}
      </span>
    </span>
  );
}
