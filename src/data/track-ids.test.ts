// Click and section ids (spec 100 §3.3, §3.6, §3.7; WA-2b #154). The source
// test makes sure every `data-track` / `track` value in the components is a
// registered id and every registered cta/link id is used.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FROM_IDS } from './contact-sources';
import { FAQS } from './automation-faqs';
import { PROJECTS } from './projects';
import { SECTION_IDS, TRACK_IDS, isTrackId, trackAttr } from './track-ids';

const ID = /^[a-z0-9][a-z0-9-]{0,63}$/;

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? tsxFiles(p) : p.endsWith('.tsx') ? [p] : [];
  });
}
const sources = tsxFiles(join(process.cwd(), 'src')).map((f) => [f, readFileSync(f, 'utf8')] as const);

describe('TRACK_IDS', () => {
  it('cta ids are exactly FROM_IDS', () => {
    expect([...TRACK_IDS.cta]).toEqual([...FROM_IDS]);
  });

  it('all ids match the pattern and stay within 100 in total', () => {
    const all = Object.values(TRACK_IDS).flat();
    for (const id of all) expect(id, id).toMatch(ID);
    expect(all.length).toBeLessThanOrEqual(100);
    for (const list of Object.values(TRACK_IDS)) expect(new Set(list).size).toBe(list.length);
  });

  it('has one faq id per FAQ, in order, never the question text', () => {
    expect(FAQS.map((f) => f.id)).toEqual([...TRACK_IDS.faq]);
  });

  it('has one project-card id per project', () => {
    const cards = TRACK_IDS.link.filter((i) => i.startsWith('project-card-'));
    expect(cards).toEqual(PROJECTS.map((p) => `project-card-${p.slug}`));
  });

  it('sections follow §3.7 order', () => {
    expect([...SECTION_IDS]).toEqual(['hero', 'so-arbeite-ich', 'beispiel', 'preise', 'daten', 'ueber-mich', 'faq', 'final']);
  });

  it('trackAttr and isTrackId agree', () => {
    expect(trackAttr('cta', 'home-cta')).toBe('cta:home-cta');
    expect(isTrackId('link', 'project-back')).toBe(true);
    expect(isTrackId('cta', 'project-back')).toBe(false);
  });
});

describe('component sources', () => {
  const literal = /data-track="([a-z]+):([^"]+)"/g;
  const viaHelper = /trackAttr\('([a-z]+)', '([^']+)'\)/g;

  it('use only registered ids in data-track attributes and trackAttr calls', () => {
    for (const [file, src] of sources) {
      for (const m of [...src.matchAll(literal), ...src.matchAll(viaHelper)]) {
        const [, kind, id] = m;
        if (kind === 'lang') expect(['de', 'en'], `${file}: ${m[0]}`).toContain(id);
        else expect(isTrackId(kind as keyof typeof TRACK_IDS, id), `${file}: ${m[0]}`).toBe(true);
      }
    }
  });

  it('use every fixed link id somewhere', () => {
    const all = sources.map(([, s]) => s).join('\n');
    // Families built from data in a template (`home-tile-${key}`, `project-card-${p.slug}`).
    expect(all).toContain("trackAttr('link', `home-tile-${key}`)");
    expect(all).toContain("trackAttr('link', `project-card-${p.slug}`)");
    for (const id of TRACK_IDS.link.filter((i) => !/^(home-tile|project-card)-/.test(i))) {
      expect(all.includes(`'${id}'`) || all.includes(`"link:${id}"`), id).toBe(true);
    }
  });

  it('mark every /automation section with data-track-section', () => {
    const page = sources.filter(([f]) => f.includes('/automation/')).map(([, s]) => s).join('\n');
    for (const id of SECTION_IDS) expect(page, id).toMatch(new RegExp(`(data-track-section|trackSection)="${id}"`));
  });
});
