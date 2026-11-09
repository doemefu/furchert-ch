import { describe, expect, it } from 'vitest';
import type { BucketStatus } from '@/lib/metrics/serviceHealth';
import { BUCKET_ORDER, NODATA_HAIRLINE, bucketStyle } from './buckets';

describe('bucketStyle', () => {
  it('gives every BucketStatus a style', () => {
    const all: BucketStatus[] = ['green', 'amber', 'red', 'nodata'];
    expect([...BUCKET_ORDER].sort()).toEqual([...all].sort());
    for (const s of all) {
      expect(bucketStyle(s).background).toBeTruthy();
      expect(bucketStyle(s).opacity).toBeGreaterThan(0);
    }
  });

  it('keeps green and nodata free of --status- tokens', () => {
    expect(bucketStyle('green').background).not.toContain('--status-');
    expect(bucketStyle('nodata').background).not.toContain('--status-');
    expect(bucketStyle('nodata').boxShadow ?? '').not.toContain('--status-');
  });

  it('uses the status tokens for amber and red', () => {
    expect(bucketStyle('amber').background).toBe('var(--status-wip)');
    expect(bucketStyle('red').background).toBe('var(--status-offline)');
  });

  it('draws no data as transparent with a hairline', () => {
    expect(bucketStyle('nodata').background).toBe('transparent');
    expect(bucketStyle('nodata').boxShadow).toBe(NODATA_HAIRLINE);
  });
});
