import { describe, expect, it } from 'vitest';

import { SEARCH_RESULT_TITLE_MAX, searchResultTitle } from './title';

const site = 'Carinya Parc';

describe('searchResultTitle', () => {
  it('keeps the site name when the story and the site still fit a search result', () => {
    expect(searchResultTitle('A kitchen before a farm', site)).toBe(
      'A kitchen before a farm | Carinya Parc',
    );
    expect(searchResultTitle('Five dams, four troughs and one very hot week', site)).toBe(
      'Five dams, four troughs and one very hot week | Carinya Parc',
    );
    expect(searchResultTitle('Five dams, four troughs and one very hot week', site).length).toBe(
      SEARCH_RESULT_TITLE_MAX,
    );
  });

  it('drops the site name when the suffix would push the story out of the result', () => {
    const story = 'Old fences, new lines: 1.4 kilometres of winter';
    expect(`${story} | ${site}`.length).toBeGreaterThan(SEARCH_RESULT_TITLE_MAX);
    expect(searchResultTitle(story, site)).toBe(story);
    expect(searchResultTitle(story, site)).not.toContain('Blog');
  });

  it('leaves a long story name whole instead of cutting it to the budget', () => {
    const story = 'Midwinter pasture: reading the ridges before we ask anything of them';
    expect(story.length).toBeGreaterThan(SEARCH_RESULT_TITLE_MAX);
    expect(searchResultTitle(story, site)).toBe(story);
  });
});
