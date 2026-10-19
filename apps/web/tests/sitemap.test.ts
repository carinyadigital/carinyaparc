/**
 * Built sitemap against the journal archive pages.
 * Run after `astro build` (`pnpm --filter web test:dist`).
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const WEB_ROOT = path.resolve(__dirname, '..');
const DIST_ROOT = path.join(WEB_ROOT, 'dist');
const DIST = existsSync(path.join(DIST_ROOT, 'client', 'index.html'))
  ? path.join(DIST_ROOT, 'client')
  : DIST_ROOT;
const SITE = 'https://carinyaparc.com.au';

const built = existsSync(path.join(DIST, 'index.html'));
const describeIfBuilt = built ? describe : describe.skip;

function sitemapXml(): string {
  const dirs = [DIST, DIST_ROOT];
  const chunks: string[] = [];
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (!/^sitemap-\d+\.xml$/.test(name)) continue;
      chunks.push(readFileSync(path.join(dir, name), 'utf8'));
    }
  }
  return chunks.join('\n');
}

function archivePages(): { pathname: string; html: string }[] {
  const pages: { pathname: string; html: string }[] = [];
  for (const kind of ['tag', 'category'] as const) {
    const dir = path.join(DIST, 'blog', kind);
    if (!existsSync(dir)) continue;
    for (const slug of readdirSync(dir)) {
      const file = path.join(dir, slug, 'index.html');
      if (!existsSync(file)) continue;
      pages.push({ pathname: `/blog/${kind}/${slug}/`, html: readFileSync(file, 'utf8') });
    }
  }
  return pages;
}

/** Story cards link to `/blog/{slug}/`. Nav and footer do not. */
function storyCount(html: string): number {
  const hrefs = [...html.matchAll(/href="(\/blog\/[^/"]+\/)"/g)].map((match) => match[1]);
  return new Set(hrefs).size;
}

function metaContent(html: string, name: string): string {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    if (!new RegExp(`\\bname\\s*=\\s*["']${name}["']`, 'i').test(tag)) continue;
    return /\bcontent\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1] ?? '';
  }
  return '';
}

describeIfBuilt('journal archive sitemap', () => {
  const xml = sitemapXml();
  const pages = archivePages();

  it('writes a sitemap and at least one journal archive', () => {
    expect(xml).toContain('<loc>');
    expect(pages.length).toBeGreaterThan(0);
  });

  it('keeps a one-story archive out of the index and the sitemap', () => {
    const thin = pages.filter((page) => storyCount(page.html) < 2);
    expect(thin.length).toBeGreaterThan(0);

    for (const page of thin) {
      expect(metaContent(page.html, 'robots')).toBe('noindex, follow');
      expect(metaContent(page.html, 'googlebot')).toContain('noindex');
      expect(xml).not.toContain(`<loc>${SITE}${page.pathname}</loc>`);
    }
  });

  it('keeps an archive of several stories indexable and listed', () => {
    const thick = pages.filter((page) => storyCount(page.html) >= 2);
    expect(thick.length).toBeGreaterThan(0);

    for (const page of thick) {
      expect(metaContent(page.html, 'robots')).toBe('index, follow');
      expect(xml).toContain(`<loc>${SITE}${page.pathname}</loc>`);
    }
  });
});
