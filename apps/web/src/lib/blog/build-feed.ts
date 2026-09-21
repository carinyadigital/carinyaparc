export type RssFeedPost = {
  title: string;
  date: string;
  excerpt: string;
  description: string;
  href: string;
};

export type RssFeedOptions = {
  posts: RssFeedPost[];
  baseUrl: string;
  title: string;
  description: string;
  feedPath?: string;
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toRfc822(dateString: string): string {
  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? new Date().toUTCString() : date.toUTCString();
}

/**
 * Build an RSS 2.0 feed document for the blog.
 * Kept as a pure function so the XML shape is unit-testable without a route.
 */
export function buildRssFeed({
  posts,
  baseUrl,
  title,
  description,
  feedPath = '/feed.xml',
}: RssFeedOptions): string {
  const feedUrl = `${baseUrl}${feedPath}`;
  const lastBuildDate = posts[0] ? toRfc822(posts[0].date) : new Date().toUTCString();

  const items = posts
    .map((post) => {
      const link = `${baseUrl}${post.href}`;

      return [
        '    <item>',
        `      <title>${escapeXml(post.title)}</title>`,
        `      <link>${escapeXml(link)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
        `      <pubDate>${toRfc822(post.date)}</pubDate>`,
        `      <description>${escapeXml(post.description || post.excerpt)}</description>`,
        '    </item>',
      ].join('\n');
    })
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${escapeXml(title)}</title>`,
    `    <link>${escapeXml(`${baseUrl}/blog/`)}</link>`,
    `    <description>${escapeXml(description)}</description>`,
    '    <language>en-au</language>',
    `    <lastBuildDate>${lastBuildDate}</lastBuildDate>`,
    `    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml"/>`,
    items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
}
