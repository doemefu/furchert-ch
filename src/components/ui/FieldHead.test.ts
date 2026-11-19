import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FieldHead } from './FieldHead';
import { FieldRow } from './FieldRow';

const row = (label: string, value: string, secondary?: string) =>
  // @ts-expect-error children are passed as the third argument, which the overload cannot see
  createElement(FieldRow, { label, secondary }, value);

describe('FieldRow', () => {
  it('renders label before value as a description list', () => {
    const html = renderToStaticMarkup(row('Wo', 'Zürcher Oberland'));
    expect(html).toBe(
      '<dl class="fr"><dt class="fr-lab">Wo</dt><dd class="fr-val">Zürcher Oberland</dd></dl>',
    );
  });

  it('adds the secondary line only when given', () => {
    expect(renderToStaticMarkup(row('Wer', 'A'))).not.toContain('fr-sub');
    expect(renderToStaticMarkup(row('Wer', 'A', 'Engineer'))).toContain(
      '<dd class="fr-sub">Engineer</dd>',
    );
  });
});

describe('FieldHead', () => {
  const head = (photo?: boolean) =>
    renderToStaticMarkup(
      createElement(
        FieldHead,
        { lead: row('Wer', 'Dominic'), photo },
        row('Was', 'KI für KMU'),
        row('Wo', 'Zürcher Oberland'),
      ),
    );

  it('sets the column count of the further fields and wraps each in a cell', () => {
    const html = head();
    expect(html).toContain('--fh-n:2');
    expect(html.match(/class="fh-cell"/g)).toHaveLength(2);
    expect(html).toContain('<div class="fh-lead">');
  });

  it('renders no photo slot by default', () => {
    expect(head()).not.toContain('fh-photo');
  });

  it('renders an empty, hidden photo slot before the lead field', () => {
    const html = head(true);
    expect(html).toContain('<span class="fh-photo" aria-hidden="true"></span>');
    expect(html.indexOf('fh-photo')).toBeLessThan(html.indexOf('Wer'));
  });
});
