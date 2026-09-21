import type { APIRoute } from 'astro';

import { buildRssFeed } from '@/lib/blog/build-feed';
import { BASE_URL, BLOG_NAME, SITE_DESCRIPTION } from '@/lib/constants';
import { getPublishedPosts, toPostSummaries } from '@/lib/content/posts';
import { toIsoDate } from '@/lib/content/dates';

const FEED_LIMIT = 20;

/** RSS 2.0 feed of the newest published posts (same shape as the Next `/feed.xml` route). */
export const GET: APIRoute = async () => {
  const entries = (await getPublishedPosts()).slice(0, FEED_LIMIT);
  const posts = await toPostSummaries(entries);

  const xml = buildRssFeed({
    posts: posts.map((post) => ({
      title: post.title,
      date: toIsoDate(post.date),
      excerpt: post.excerpt,
      description: post.description,
      href: post.href,
    })),
    baseUrl: BASE_URL,
    title: BLOG_NAME,
    description: SITE_DESCRIPTION,
  });

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
};
