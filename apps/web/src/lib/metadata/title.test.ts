import { describe, expect, it } from 'vitest';

import { journalStoryTitle } from './title';

const SITE = 'Carinya Parc';

describe('journalStoryTitle', () => {
  it('appends the site name when the story still fits a search result', () => {
    expect(journalStoryTitle('A kitchen before a farm', SITE)).toBe(
      'A kitchen before a farm | Carinya Parc',
    );
  });

  it('keeps the site name when the title is exactly sixty characters', () => {
    const story = 'Five dams, four troughs and one very hot week';
    const title = journalStoryTitle(story, SITE);

    expect(title).toBe(`${story} | ${SITE}`);
    expect(title).toHaveLength(60);
  });

  it('uses the story name alone when the site name would exceed sixty characters', () => {
    const story = 'Old fences, new lines: 1.4 kilometres of winter';

    expect(`${story} | ${SITE}`.length).toBeGreaterThan(60);
    expect(journalStoryTitle(story, SITE)).toBe(story);
  });

  it('leaves a story name whole when the name itself is longer than a search result', () => {
    const story = 'Midwinter pasture: reading the ridges before we ask anything of them';
    const title = journalStoryTitle(story, SITE);

    expect(title).toBe(story);
    expect(title.length).toBeGreaterThan(60);
    expect(title).not.toContain('Blog');
    expect(title.endsWith(SITE)).toBe(false);
  });

  it('drops the site name on the first character past sixty', () => {
    const suffix = ` | ${SITE}`;
    const fitting = 'x'.repeat(60 - suffix.length);
    const overflowing = 'y'.repeat(60 - suffix.length + 1);

    expect(journalStoryTitle(fitting, SITE)).toBe(`${fitting}${suffix}`);
    expect(journalStoryTitle(overflowing, SITE)).toBe(overflowing);
  });
});
