import { describe, expect, it } from 'vitest';

import { buildRssFeed, type RssFeedPost } from './build-feed';

function makePost(overrides: Partial<RssFeedPost> = {}): RssFeedPost {
  return {
    title: 'My Post',
    date: '2026-06-01',
    excerpt: 'Excerpt text',
    description: 'Description text',
    href: '/blog/my-post/',
    ...overrides,
  };
}

describe('buildRssFeed', () => {
  const baseOptions = {
    baseUrl: 'https://carinyaparc.com.au',
    title: 'Carinya Parc Blog',
    description: 'Life on Pasture',
  };

  it('builds a valid RSS 2.0 channel with item links from post hrefs', () => {
    const xml = buildRssFeed({ ...baseOptions, posts: [makePost()] });

    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain('<title>Carinya Parc Blog</title>');
    expect(xml).toContain('<link>https://carinyaparc.com.au/blog/</link>');
    expect(xml).toContain('<link>https://carinyaparc.com.au/blog/my-post/</link>');
    expect(xml).toContain(
      '<guid isPermaLink="true">https://carinyaparc.com.au/blog/my-post/</guid>',
    );
    expect(xml).toContain(
      '<atom:link href="https://carinyaparc.com.au/feed.xml" rel="self" type="application/rss+xml"/>',
    );
  });

  it('escapes XML entities in titles and descriptions', () => {
    const xml = buildRssFeed({
      ...baseOptions,
      posts: [makePost({ title: 'Soil & Water <update>', description: 'A "quoted" note' })],
    });

    expect(xml).toContain('<title>Soil &amp; Water &lt;update&gt;</title>');
    expect(xml).toContain('<description>A &quot;quoted&quot; note</description>');
    expect(xml).not.toContain('<update>');
  });

  it('renders an empty channel without items when there are no posts', () => {
    const xml = buildRssFeed({ ...baseOptions, posts: [] });

    expect(xml).toContain('<channel>');
    expect(xml).not.toContain('<item>');
  });
});
