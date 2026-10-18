import type { APIRoute } from 'astro';

/**
 * Crawl rules for the public site. The sitemap URL reuses `site` from
 * `astro.config.mjs` and keeps `/sitemap.xml`, which redirects to the
 * index `@astrojs/sitemap` writes.
 */
export const GET: APIRoute = ({ site }) => {
  if (!site) {
    throw new Error('astro.config.mjs site is required to build robots.txt');
  }

  const sitemapURL = new URL('sitemap.xml', site);
  const body = [
    'User-agent: *',
    'Allow: /',
    '',
    'Disallow: /api/',
    'Disallow: /monitoring/',
    '',
    `Sitemap: ${sitemapURL.href}`,
    '',
  ].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
