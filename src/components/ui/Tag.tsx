// Quiet text tag for a kind or a status (redesign «Formular», PR 6). Looks live
// in globals.css (`.tag`); the dashboard keeps its ETHON look via `.ethon .tag`.
// `blue` marks the emphasised tag (accent wash on public pages, blue wash in the dashboard).
// `contrast`: no-op since #151; kept so the /automation call sites (#145) stay unchanged.
import type { ReactNode } from 'react';

export function Tag({
  children,
  blue,
}: {
  children: ReactNode;
  blue?: boolean;
  contrast?: boolean;
}) {
  return (
    <span className="tag" data-emph={blue ? '' : undefined}>
      {children}
    </span>
  );
}
