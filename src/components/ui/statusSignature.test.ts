// Source guard for the status signature (#177): a status colour used as a
// background (the LED) belongs in StatusDot. Anything else needs an entry here.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const ALLOWED = [
  'src/components/ui/StatusDot.tsx',
  'src/app/[locale]/dashboard/devices/SchedulesPanel.tsx', // toggle track
  'src/app/[locale]/dashboard/services/', // bucket bars and StripToggle
  'src/app/[locale]/dashboard/network/NetworkShell.tsx', // LOGIN_COLORS
  'src/app/[locale]/dashboard/analytics/',
];

const BACKGROUND = /background(Color)?:\s*[^,}\n]*var\(--status-/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return sourceFiles(p);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [p] : [];
  });
}

describe('status signature', () => {
  it('uses --status-* as a background only in StatusDot and the allowlist', () => {
    const root = process.cwd();
    const offenders = sourceFiles(join(root, 'src'))
      .map((f) => relative(root, f).split(sep).join('/'))
      .filter((rel) => !ALLOWED.some((a) => rel === a || (a.endsWith('/') && rel.startsWith(a))))
      .filter((rel) => BACKGROUND.test(readFileSync(join(root, rel), 'utf8')));
    expect(offenders).toEqual([]);
  });
});
