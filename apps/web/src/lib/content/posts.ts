/**
 * Read-side helpers over the `posts`, `authors` and `categories` collections.
 * Pages call these instead of `getCollection` directly so draft filtering, sorting and the
 * card shape stay in one place.
 */
import { getCollection, getEntry, type CollectionEntry } from 'astro:content';

import tagNames from '../../../../../content/tags.json';
import { formatContentDate, formatJournalMeta } from './dates';
import { categoryUrl, postUrl, tagUrl } from '../urls';

export type PostEntry = CollectionEntry<'posts'>;

export interface PostSummary {
  id: string;
  slug: string;
  title: string;
  date: Date;
  formattedDate: string;
  /** "Jul 2026 · 4 min" */
  meta: string;
  excerpt: string;
  description: string;
  categoryName: string | null;
  categorySlug: string | null;
  tags: string[];
  featured: boolean;
  image: PostEntry['data']['image'];
  imageAlt: string;
  href: string;
  authorName: string;
}

const TAG_NAMES = tagNames as Record<string, string>;

export function tagName(slug: string): string {
  return TAG_NAMES[slug] ?? slug;
}

export function isPublished(entry: { data: { draft: boolean } }): boolean {
  return !entry.data.draft || import.meta.env.DEV;
}

function byDateDesc(a: PostEntry, b: PostEntry): number {
  return b.data.date.getTime() - a.data.date.getTime();
}

/** Published posts, newest first. In `astro dev` drafts are included so they can be previewed. */
export async function getPublishedPosts(): Promise<PostEntry[]> {
  const posts = await getCollection('posts', isPublished);
  return posts.sort(byDateDesc);
}

export async function getFeaturedPosts(limit?: number): Promise<PostEntry[]> {
  const posts = (await getPublishedPosts()).filter((post) => post.data.featured);
  return typeof limit === 'number' ? posts.slice(0, limit) : posts;
}

export async function toPostSummary(entry: PostEntry): Promise<PostSummary> {
  const [author, category] = await Promise.all([
    getEntry(entry.data.author),
    entry.data.category ? getEntry(entry.data.category) : Promise.resolve(undefined),
  ]);
  const description = entry.data.description ?? entry.data.excerpt;
  return {
    id: entry.id,
    slug: entry.id,
    title: entry.data.title,
    date: entry.data.date,
    formattedDate: formatContentDate(entry.data.date),
    meta: formatJournalMeta(entry.data.date, entry.body ?? entry.data.excerpt),
    excerpt: entry.data.excerpt,
    description,
    categoryName: category?.data.name ?? null,
    categorySlug: category?.id ?? null,
    tags: entry.data.tags,
    featured: entry.data.featured,
    image: entry.data.image,
    imageAlt: entry.data.imageAlt ?? entry.data.title,
    href: postUrl(entry.id),
    authorName: author?.data.name ?? 'Carinya Parc',
  };
}

export async function toPostSummaries(entries: PostEntry[]): Promise<PostSummary[]> {
  return Promise.all(entries.map(toPostSummary));
}

/** Categories that have at least one published post, with their posts. */
export async function getCategoriesWithPosts(): Promise<
  { id: string; name: string; description?: string; href: string; posts: PostEntry[] }[]
> {
  const [categories, posts] = await Promise.all([getCollection('categories'), getPublishedPosts()]);
  return categories
    .map((category) => ({
      id: category.id,
      name: category.data.name,
      description: category.data.description,
      href: categoryUrl(category.id),
      posts: posts.filter((post) => post.data.category?.id === category.id),
    }))
    .filter((category) => category.posts.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Tags used by at least one published post, with their posts. */
export async function getTagsWithPosts(): Promise<
  { id: string; name: string; href: string; posts: PostEntry[] }[]
> {
  const posts = await getPublishedPosts();
  const bySlug = new Map<string, PostEntry[]>();
  for (const post of posts) {
    for (const tag of post.data.tags) {
      bySlug.set(tag, [...(bySlug.get(tag) ?? []), post]);
    }
  }
  return [...bySlug.entries()]
    .map(([id, tagged]) => ({ id, name: tagName(id), href: tagUrl(id), posts: tagged }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Up to `limit` other posts sharing a category or tag, most overlap first, newest first. */
export async function getRelatedPosts(entry: PostEntry, limit = 3): Promise<PostEntry[]> {
  const posts = (await getPublishedPosts()).filter((post) => post.id !== entry.id);
  const score = (post: PostEntry): number => {
    let s = 0;
    if (entry.data.category && post.data.category?.id === entry.data.category.id) s += 2;
    s += post.data.tags.filter((tag) => entry.data.tags.includes(tag)).length;
    return s;
  };
  return posts
    .map((post) => ({ post, score: score(post) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || byDateDesc(a.post, b.post))
    .slice(0, limit)
    .map((item) => item.post);
}
