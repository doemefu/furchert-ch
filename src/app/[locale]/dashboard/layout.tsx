// The dashboard stays on the ETHON look (redesign spec, «Abgrenzung
// Dashboard»). `.ethon` lets shared components (Tag, StatusDot, Icon) keep
// their old styling here while public pages move to the new tokens. The
// wrapper is a plain block `div`; globals.css (`.ethon`) gives it the ETHON
// page background, frame and focus ring. DM Mono (`--mono`) loads here only.
// Portalled overlays set `.ethon` and `dmMono.variable` again.
import type { ReactNode } from 'react';
import { dmMono } from '@/lib/dashboardFont';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <div className={`ethon ${dmMono.variable}`}>{children}</div>;
}
