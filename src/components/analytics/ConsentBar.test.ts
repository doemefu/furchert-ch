// Ghost-click guard of the consent bar (WA-6 #158 review, blocker 1): the tap
// that opens the bar on a phone must not land on Allow or Decline unseen.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ghostClick } from './ConsentBar';

const src = readFileSync(join(process.cwd(), 'src/components/analytics/ConsentBar.tsx'), 'utf8');

describe('consent bar ghost-click guard', () => {
  it('drops a pointer click whose pointerdown did not start inside the bar', () => {
    expect(ghostClick(false, 1)).toBe(true);
  });
  it('accepts a click that began inside the bar (incl. after the footer reopen)', () => {
    expect(ghostClick(true, 1)).toBe(false);
  });
  it('accepts keyboard and assistive-tech activation (detail 0)', () => {
    expect(ghostClick(false, 0)).toBe(false);
    expect(ghostClick(true, 0)).toBe(false);
  });
  it('arms on a pointerdown on the bar root and filters both buttons in the capture phase', () => {
    expect(src).toMatch(/onPointerDown=\{\(\) => \(armed\.current = true\)\}/);
    expect(src).toMatch(/onClickCapture=\{\(e: MouseEvent\) => \{\s*if \(ghostClick\(armed\.current, e\.detail\)\) \{\s*e\.stopPropagation\(\);\s*e\.preventDefault\(\);/);
    // Both buttons sit inside the filtered container.
    const actions = src.slice(src.indexOf('className="consent-actions"'));
    expect(actions.match(/<Btn\b/g)).toHaveLength(2);
  });
});
