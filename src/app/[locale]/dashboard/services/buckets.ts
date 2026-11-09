// Bucket styles of the /dashboard/services matrix (#179). Pure, so it is
// unit-tested. Healthy days are green at .85 (Dominic preferred the original
// colouring over the grey of #186), amber and red carry their status colour,
// no data is a neutral grey, never a status colour.
import type { BucketStatus } from '@/lib/metrics/serviceHealth';

export interface BucketStyle {
  background: string;
  boxShadow?: string;
  opacity: number;
}

export const BUCKET_ORDER: BucketStatus[] = ['green', 'amber', 'red', 'nodata'];

const STYLES: Record<BucketStatus, BucketStyle> = {
  green: { background: 'var(--status-online)', opacity: 0.85 },
  amber: { background: 'var(--status-wip)', opacity: 1 },
  red: { background: 'var(--status-offline)', opacity: 1 },
  nodata: { background: 'var(--n-20)', opacity: 1 },
};

export function bucketStyle(status: BucketStatus): BucketStyle {
  return STYLES[status];
}
