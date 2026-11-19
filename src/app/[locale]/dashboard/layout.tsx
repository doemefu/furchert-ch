// The dashboard stays on the ETHON look (redesign spec, «Abgrenzung
// Dashboard»). `.ethon` lets shared components (Tag, StatusDot, Icon) keep
// their old styling here while public pages move to the new tokens. The
// wrapper is a plain block `div`; globals.css (`.ethon`) gives it the ETHON
// page background, frame and focus ring. Portalled overlays set `.ethon` again.
import type { ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <div className="ethon">{children}</div>;
}
