// Bucket styles of the /dashboard/services matrix (#179). Pure, so it is
// unit-tested. Healthy cells are a quiet grey (the page has no accent
// series); only amber and red carry a status colour. No data is transparent
// with a hairline, never a status colour.
import type { BucketStatus } from '@/lib/metrics/serviceHealth';

export interface BucketStyle {
  background: string;
  boxShadow?: string;
  opacity: number;
}

export const NODATA_HAIRLINE = 'inset 0 0 0 1px rgba(162,167,176,.35)';

export const BUCKET_ORDER: BucketStatus[] = ['green', 'amber', 'red', 'nodata'];

const STYLES: Record<BucketStatus, BucketStyle> = {
  green: { background: 'var(--n-50)', opacity: 1 },
  amber: { background: 'var(--status-wip)', opacity: 1 },
  red: { background: 'var(--status-offline)', opacity: 1 },
  nodata: { background: 'transparent', boxShadow: NODATA_HAIRLINE, opacity: 1 },
};

export function bucketStyle(status: BucketStatus): BucketStyle {
  return STYLES[status];
}
