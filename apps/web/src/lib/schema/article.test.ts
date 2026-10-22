import { describe, expect, it } from 'vitest';

import { BLOG_NAME, JOURNAL_NAME } from '../constants';
import { generateArticleSchema } from './article';

describe('generateArticleSchema', () => {
  it('names the journal Life on Pasture', () => {
    const schema = generateArticleSchema({
      title: 'A note from the ridge',
      slug: 'a-note-from-the-ridge',
      datePublished: '2026-01-01T00:00:00.000Z',
    });

    expect(schema.articleSection).toBe(JOURNAL_NAME);
    expect(schema.description).toBe(`A note from ${JOURNAL_NAME}`);
    expect(schema.isPartOf).toEqual({
      '@type': 'Blog',
      name: BLOG_NAME,
      url: expect.stringMatching(/\/blog$/),
    });
  });
});
