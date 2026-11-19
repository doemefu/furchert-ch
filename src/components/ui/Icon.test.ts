import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Icon } from './Icon';
import { StatusDot, StatusLabel } from './StatusDot';
import { Tag } from './Tag';

const NAMES = [
  'arrow', 'lock', 'github', 'ext', 'server', 'globe', 'code', 'chip', 'alert', 'chart', 'db', 'flow',
  'git', 'users', 'mic', 'boat', 'iot', 'ai', 'check', 'cpu', 'mail', 'cloud', 'menu', 'close', 'chevron',
];

/* eslint-disable react/no-children-prop -- components typed with a required `children` prop */
describe('Icon', () => {
  it('draws every icon at one 1.5 stroke, decorative and unfocusable', () => {
    for (const name of NAMES) {
      const out = renderToStaticMarkup(createElement(Icon, { name }));
      expect(out, name).toContain('aria-hidden="true"');
      expect(out, name).not.toMatch(/stroke-width="(?!1\.5")/);
    }
  });
  it('has no spark icon', () => {
    // An unknown name falls back to the `code` icon.
    expect(renderToStaticMarkup(createElement(Icon, { name: 'spark' }))).toBe(
      renderToStaticMarkup(createElement(Icon, { name: 'code' })),
    );
  });
});

describe('StatusDot, StatusLabel and Tag', () => {
  it('keeps the dot decorative unless it has a label', () => {
    expect(renderToStaticMarkup(createElement(StatusDot, { status: 'online' }))).toContain('aria-hidden="true"');
    expect(renderToStaticMarkup(createElement(StatusDot, { status: 'offline', label: 'Down' }))).toContain(
      'role="img" aria-label="Down"',
    );
  });
  it('carries the status as data for the stylesheet', () => {
    const out = renderToStaticMarkup(createElement(StatusLabel, { status: 'wip', children: 'In progress' }));
    expect(out).toContain('class="led" data-status="wip"');
    expect(out).toContain('class="led-text" data-status="wip"');
  });
  it('marks the emphasised tag', () => {
    expect(renderToStaticMarkup(createElement(Tag, { blue: true, children: 'x' }))).toContain('data-emph');
    expect(renderToStaticMarkup(createElement(Tag, { children: 'x' }))).not.toContain('data-emph');
  });
});
