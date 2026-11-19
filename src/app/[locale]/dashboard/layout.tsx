// The dashboard stays on the ETHON look (redesign spec, «Abgrenzung
// Dashboard»). `.ethon` lets shared components (Tag, StatusDot, Icon) keep
// their old styling here while public pages move to the new tokens. The
// wrapper is a plain block `div` that sets no style of its own.
import type { ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <div className="ethon">{children}</div>;
}
