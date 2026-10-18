import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('astro:content', () => ({
  getCollection: vi.fn(),
  getEntry: vi.fn(),
}));

import { getEntry } from 'astro:content';

import { isPublished, postsForJournalGrid, toPostSummary, type PostEntry } from './posts';

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

describe('toPostSummary reading time', () => {
  function entry(body: string | undefined, excerpt: string): PostEntry {
    return {
      id: 'first-syntropic-lines',
      collection: 'posts',
      data: {
        title: 'The first syntropic lines',
        date: new Date(Date.UTC(2026, 8, 18)),
        author: { collection: 'authors', id: 'jonno' },
        tags: [],
        featured: true,
        excerpt,
        draft: false,
      },
      body,
    } as PostEntry;
  }

  it('times the body, so a long post is not one minute from its excerpt', async () => {
    vi.mocked(getEntry).mockResolvedValue({ data: { name: 'Jonno' } } as Awaited<
      ReturnType<typeof getEntry>
    >);

    const body = Array.from({ length: 850 }, () => 'tree').join(' ');
    const summary = await toPostSummary(entry(body, 'A short excerpt.'));

    expect(summary.readMinutes).toBe(4);
    expect(summary.meta).toBe('Sept 2026 · 4 min');
    expect(summary.authorName).toBe('Jonno');
  });

  it('uses the excerpt when the body is missing', async () => {
    vi.mocked(getEntry).mockResolvedValue(undefined);

    const excerpt = Array.from({ length: 400 }, () => 'word').join(' ');
    const summary = await toPostSummary(entry(undefined, excerpt));

    expect(summary.readMinutes).toBe(2);
    expect(summary.meta).toContain('2 min');
    expect(summary.authorName).toBe('Carinya Parc');
  });
});
