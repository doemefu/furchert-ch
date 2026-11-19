import { createElement } from 'react';
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FieldHead } from './FieldHead';
import { FieldList, FieldRow } from './FieldRow';
import type { FieldRowProps } from './FieldRow';

const row = (label: string, value: string, secondary?: string, className?: string) =>
  // eslint-disable-next-line react/no-children-prop
  createElement(FieldRow, { label, secondary, className, children: value });

type Kid = ReactElement<FieldRowProps> | false | null | undefined;

const head = (props: { photo?: boolean; aside?: ReactElement<FieldRowProps>; className?: string } = {}, ...kids: Array<Kid | Kid[]>) =>
  renderToStaticMarkup(
    createElement(FieldHead, { lead: row('Wer', 'Dominic'), ...props }, ...kids),
  );

describe('FieldRow', () => {
  it('renders label before value as a group of a description list', () => {
    expect(renderToStaticMarkup(row('Wo', 'Zürcher Oberland'))).toBe(
      '<div class="fr"><dt class="fr-lab">Wo</dt><dd class="fr-val">Zürcher Oberland</dd></div>',
    );
  });

  it('adds the secondary line only when given', () => {
    expect(renderToStaticMarkup(row('Wer', 'A'))).not.toContain('fr-sub');
    expect(renderToStaticMarkup(row('Wer', 'A', 'Engineer'))).toContain('<dd class="fr-sub">Engineer</dd>');
  });

  it('passes className through', () => {
    expect(renderToStaticMarkup(row('Wer', 'A', undefined, 'extra'))).toContain('class="fr extra"');
  });

  it('text variant adds fr-text and no meta dd unless given', () => {
    // eslint-disable-next-line react/no-children-prop
    const html = renderToStaticMarkup(createElement(FieldRow, { label: 'Wo', variant: 'text', children: 'A' }));
    expect(html).toBe('<div class="fr fr-text"><dt class="fr-lab">Wo</dt><dd class="fr-val">A</dd></div>');
  });

  it('puts the meta line between label and value', () => {
    const html = renderToStaticMarkup(
      // eslint-disable-next-line react/no-children-prop
      createElement(FieldRow, { label: 'Eingang', variant: 'text', meta: 'Von: R. Brunner', children: 'Betreff' }),
    );
    expect(html).toBe(
      '<div class="fr fr-text"><dt class="fr-lab">Eingang</dt><dd class="fr-meta">Von: R. Brunner</dd><dd class="fr-val">Betreff</dd></div>',
    );
  });

  it('takes a table as the value of a text field', () => {
    const html = renderToStaticMarkup(
      // eslint-disable-next-line react/no-children-prop
      createElement(FieldRow, { label: 'Entwurf', variant: 'text', children: createElement('table', null) }),
    );
    expect(html).toContain('<dd class="fr-val"><table></table></dd>');
  });

  it('FieldList wraps rows in one dl', () => {
    const html = renderToStaticMarkup(createElement(FieldList, null, row('A', '1'), row('B', '2')));
    expect(html.startsWith('<dl class="fl">')).toBe(true);
    expect(html.match(/<dl/g)).toHaveLength(1);
  });
});

describe('FieldHead', () => {
  const two = [row('Was', 'KI für KMU'), row('Wo', 'Zürcher Oberland')];

  it('is one dl and counts the further fields', () => {
    const html = head({}, ...two);
    expect(html.match(/<dl/g)).toHaveLength(1);
    expect(html).toContain('--fh-n:2');
    expect(html).toContain('class="fr fh-lead"');
  });

  it('drops falsy children from the count', () => {
    const html = head({}, two[0], false, null, two[1]);
    expect(html).toContain('--fh-n:2');
    expect(html.match(/class="fr[ "]/g)).toHaveLength(3);
  });

  it('accepts conditional children and mapped arrays', () => {
    const cond = false as boolean;
    const html = head({}, cond && row('Nie', 'x'), [row('A', '1'), row('B', '2')]);
    expect(html).toContain('--fh-n:2');
  });

  it('skips --fh-n and marks the head solo without further fields', () => {
    const html = head();
    expect(html).not.toContain('--fh-n');
    expect(html).toContain('class="fh fh-solo"');
  });

  it('passes className through', () => {
    expect(head({ className: 'mine' }, ...two)).toContain('class="fh mine"');
  });

  it('renders no photo slot by default', () => {
    expect(head({}, ...two)).not.toContain('fh-photo');
  });

  it('renders an empty, hidden photo dd in the lead group', () => {
    const html = head({ photo: true }, ...two);
    expect(html).toContain('<dd class="fh-photo" aria-hidden="true"></dd>');
    expect(html).toContain('class="fr fr-photo fh-lead"');
    expect(html.indexOf('fh-photo')).toBeLessThan(html.indexOf('Was'));
  });

  it('renders the aside last, desktop-only, and counts it', () => {
    const html = head({ aside: row('Antwort', 'Innert 24 h') }, ...two);
    expect(html).toContain('--fh-n:3');
    expect(html).toContain('fh-has-aside');
    expect(html).toContain('class="fr fh-desk"');
    expect(html.lastIndexOf('Antwort')).toBeGreaterThan(html.indexOf('Zürcher Oberland'));
  });
});
