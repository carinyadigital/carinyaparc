import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('astro:content', () => ({
  getCollection: vi.fn(),
  getEntry: vi.fn(),
}));

import { isPublished, postsForJournalGrid } from './posts';

const draft = { data: { draft: true } };
const published = { data: { draft: false } };

describe('isPublished', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('excludes a draft when the build is not the dev server', () => {
    vi.stubEnv('DEV', false);

    expect(isPublished(draft)).toBeFalsy();
    expect(isPublished(published)).toBe(true);
  });

  it('includes a draft when the dev server is running', () => {
    vi.stubEnv('DEV', true);

    expect(isPublished(draft)).toBeTruthy();
    expect(isPublished(published)).toBe(true);
  });
});

describe('postsForJournalGrid', () => {
  const entry = (id: string, featured: boolean) => ({ id, data: { featured } });

  it('keeps featured posts that are not in the hero', () => {
    const posts = [
      entry('newest-featured', true),
      entry('new-plain', false),
      entry('older-featured', true),
      entry('oldest-plain', false),
    ];

    expect(postsForJournalGrid(posts).map((post) => post.id)).toEqual([
      'new-plain',
      'older-featured',
      'oldest-plain',
    ]);
  });

  it('keeps the full list when nothing is featured', () => {
    const posts = [entry('a', false), entry('b', false)];

    expect(postsForJournalGrid(posts).map((post) => post.id)).toEqual(['a', 'b']);
  });

  it('leaves out every featured post when the hero shows all of them', () => {
    const posts = [entry('a', true), entry('b', false), entry('c', true)];

    expect(postsForJournalGrid(posts, 2).map((post) => post.id)).toEqual(['b']);
  });
});
