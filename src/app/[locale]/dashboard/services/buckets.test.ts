import { describe, expect, it } from 'vitest';
import type { BucketStatus } from '@/lib/metrics/serviceHealth';
import { BUCKET_ORDER, bucketStyle } from './buckets';

describe('bucketStyle', () => {
  it('gives every BucketStatus a style', () => {
    const all: BucketStatus[] = ['green', 'amber', 'red', 'nodata'];
    expect([...BUCKET_ORDER].sort()).toEqual([...all].sort());
    for (const s of all) {
      expect(bucketStyle(s).background).toBeTruthy();
      expect(bucketStyle(s).opacity).toBeGreaterThan(0);
    }
  });

  it('keeps no data neutral, never a status colour', () => {
    expect(bucketStyle('nodata').background).toBe('var(--n-20)');
    expect(bucketStyle('nodata').boxShadow).toBeUndefined();
  });

  it('uses the status tokens for green, amber and red', () => {
    expect(bucketStyle('green').background).toBe('var(--status-online)');
    expect(bucketStyle('green').opacity).toBe(0.85);
    expect(bucketStyle('amber').background).toBe('var(--status-wip)');
    expect(bucketStyle('red').background).toBe('var(--status-offline)');
  });
});
