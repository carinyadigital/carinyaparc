import { describe, expect, it } from 'vitest';

import { JOURNAL_NAME } from '../constants';
import { generateBreadcrumbsFromPath } from './breadcrumb';

describe('generateBreadcrumbsFromPath', () => {
  it('names the journal Life on Pasture', () => {
    const crumbs = generateBreadcrumbsFromPath('/blog/why-highland-cattle/');

    expect(crumbs.map((crumb) => crumb.name)).toEqual([
      'Home',
      JOURNAL_NAME,
      'Why Highland Cattle',
    ]);
  });
});
