import { describe, expect, it } from 'vitest';

import { JOURNAL_NAME } from '../constants';
import { generateBreadcrumbsFromPath } from './breadcrumb';

describe('generateBreadcrumbsFromPath', () => {
  it('names the journal Life on Pasture', () => {
    const crumbs = generateBreadcrumbsFromPath('/blog/midwinter-pasture/');

    expect(crumbs.map((crumb) => crumb.name)).toEqual(['Home', JOURNAL_NAME, 'Midwinter Pasture']);
    expect(crumbs.map((crumb) => crumb.position)).toEqual([1, 2, 3]);
  });

  it('does not link /legal/, which has no page', () => {
    const crumbs = generateBreadcrumbsFromPath('/legal/privacy-policy/');

    expect(crumbs.map((crumb) => crumb.name)).toEqual(['Home', 'Privacy Policy']);
    expect(crumbs.map((crumb) => pathOf(crumb.url))).toEqual(['/', '/legal/privacy-policy/']);
    expect(crumbs.map((crumb) => crumb.position)).toEqual([1, 2]);
  });

  it('keeps About because /about/ is a real page', () => {
    const crumbs = generateBreadcrumbsFromPath('/about/the-property/');

    expect(crumbs.map((crumb) => crumb.name)).toEqual(['Home', 'About', 'The Property']);
    expect(crumbs.map((crumb) => pathOf(crumb.url))).toEqual([
      '/',
      '/about/',
      '/about/the-property/',
    ]);
  });
});

function pathOf(url: string): string {
  return url.replace(/^https?:\/\/[^/]+/, '') || '/';
}
