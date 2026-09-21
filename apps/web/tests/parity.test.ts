/**
 * Cut-over parity: the built site (`dist/`) against the production baseline in
 * tests/baseline/. Run `astro build` first; `pnpm test:parity`.
 *
 * - Every production URL is still built, except the empty archives we deliberately dropped
 *   (which must be absent from the generated sitemap) and the routes production served broken,
 *   which must now exist.
 * - Representative pages keep their description, canonical, og:type, robots and JSON-LD types,
 *   and the title once production's doubled site suffix is normalised.
 * - Every HTML page carries the common <head> set.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const WEB_ROOT = path.resolve(__dirname, '..');
const DIST_ROOT = path.join(WEB_ROOT, 'dist');
const DIST = existsSync(path.join(DIST_ROOT, 'client', 'index.html'))
  ? path.join(DIST_ROOT, 'client')
  : DIST_ROOT;
const BASELINE = path.join(WEB_ROOT, 'tests', 'baseline');

interface Urls {
  base: string;
  sitemapPaths: string[];
  nonSitemapPaths: string[];
  publishedButNotInSitemap: { posts: string[]; recipes: string[] };
  intentionallyRemoved: { paths: string[] };
  redirected: { paths: Record<string, string> };
  knownBrokenInProduction: string[];
}

interface PageRecord {
  status: number;
  title?: string;
  titleNormalised?: string;
  description?: string;
  descriptionPrefix?: string;
  canonical?: string;
  ogType?: string;
  ogImage?: string | null;
  jsonLdTypes?: string[];
  empty?: boolean;
  note?: string;
}

interface Metadata {
  commonHead: Record<string, string>;
  pages: Record<string, PageRecord>;
}

const urls = JSON.parse(readFileSync(path.join(BASELINE, 'urls.json'), 'utf8')) as Urls;
const metadata = JSON.parse(readFileSync(path.join(BASELINE, 'metadata.json'), 'utf8')) as Metadata;

const built = existsSync(DIST);
const describeIfBuilt = built ? describe : describe.skip;

function distFile(pathname: string): string {
  if (pathname.endsWith('/')) return path.join(DIST, pathname, 'index.html');
  return path.join(DIST, pathname);
}

function readHtml(pathname: string): string {
  return readFileSync(distFile(pathname), 'utf8');
}

function meta(html: string, key: string): string | null {
  const tag = new RegExp(`<meta\\s+(?:[^>]*?\\s)?(?:name|property)=["']${key}["'][^>]*>`, 'i').exec(
    html,
  );
  if (!tag) return null;
  const content = /content=["']([^"']*)["']/i.exec(tag[0]);
  return content?.[1] ?? null;
}

function linkHref(html: string, rel: string): string | null {
  const tag = new RegExp(`<link\\s+(?:[^>]*?\\s)?rel=["']${rel}["'][^>]*>`, 'i').exec(html);
  if (!tag) return null;
  return /href=["']([^"']*)["']/i.exec(tag[0])?.[1] ?? null;
}

function title(html: string): string | null {
  return /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim() ?? null;
}

function decode(value: string | null): string | null {
  return value === null
    ? null
    : value
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
}

function jsonLdTypes(html: string): string[] {
  const types = new Set<string>();
  const pattern = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null = pattern.exec(html);
  while (match) {
    const parsed = JSON.parse(match[1] ?? '{}') as Record<string, unknown>;
    const nodes = Array.isArray(parsed['@graph'])
      ? (parsed['@graph'] as Record<string, unknown>[])
      : [parsed];
    for (const node of nodes) {
      const type = node['@type'];
      if (typeof type === 'string') types.add(type);
    }
    match = pattern.exec(html);
  }
  return [...types].sort();
}

function normaliseTitle(value: string | null): string | null {
  return value === null ? null : value.replace(/\s*\|\s*Carinya Parc$/, '').trim();
}

function allHtmlFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return allHtmlFiles(full);
    return entry.endsWith('.html') ? [full] : [];
  });
}

describeIfBuilt('URL parity', () => {
  const removed = new Set(urls.intentionallyRemoved.paths);
  const redirected = new Set(Object.keys(urls.redirected.paths));

  it('builds every production URL that was not deliberately removed or redirected', () => {
    const missing = urls.sitemapPaths.filter(
      (p) => !removed.has(p) && !redirected.has(p) && !existsSync(distFile(p)),
    );
    expect(missing).toEqual([]);
  });

  it('redirects every retired URL (with and without trailing slash) to a page that exists', () => {
    const vercelConfig = path.join(WEB_ROOT, '.vercel', 'output', 'config.json');
    const routes = (
      JSON.parse(readFileSync(vercelConfig, 'utf8')) as {
        routes: Array<{
          src?: string;
          status?: number;
          headers?: Record<string, string>;
          continue?: boolean;
        }>;
      }
    ).routes;
    // Header-only routes (`continue: true`, e.g. the security headers) do not end matching.
    const firstMatch = (pathname: string) =>
      routes.find(
        (route) =>
          typeof route.src === 'string' && !route.continue && new RegExp(route.src).test(pathname),
      );

    for (const [from, to] of Object.entries(urls.redirected.paths)) {
      expect(existsSync(distFile(to)), `${from} → ${to}`).toBe(true);
      expect(existsSync(distFile(from)), `${from} must not also be built as a page`).toBe(false);
      // The canonical (trailing-slash) form must hit the 301 directly.
      const slashed = firstMatch(from);
      expect(slashed?.status, from).toBe(301);
      expect(slashed?.headers?.Location, from).toBe(to);
      // The bare form is first normalised by Vercel's trailing-slash 308, then redirected.
      const bare = firstMatch(from.replace(/\/$/, ''));
      expect([301, 308]).toContain(bare?.status);
    }
  });

  it('does not build the deliberately removed empty archives', () => {
    const present = urls.intentionallyRemoved.paths.filter((p) => existsSync(distFile(p)));
    expect(present).toEqual([]);
  });

  it('fixes the routes production served broken', () => {
    const missing = urls.knownBrokenInProduction.filter((p) => !existsSync(distFile(p)));
    expect(missing).toEqual([]);
  });

  it('builds the published content that production had not yet listed', () => {
    const paths = [
      ...urls.publishedButNotInSitemap.posts,
      ...urls.publishedButNotInSitemap.recipes,
    ];
    expect(paths.filter((p) => !existsSync(distFile(p)))).toEqual([]);
  });

  it('serves the non-sitemap routes', () => {
    for (const p of urls.nonSitemapPaths) {
      expect(existsSync(distFile(p)), p).toBe(true);
    }
    expect(existsSync(path.join(DIST, '404.html'))).toBe(true);
  });

  it('keeps removed archives out of the generated sitemap', () => {
    const sitemap = readFileSync(path.join(DIST, 'sitemap-0.xml'), 'utf8');
    for (const p of urls.intentionallyRemoved.paths) {
      expect(sitemap.includes(`${urls.base}${p}`), p).toBe(false);
    }
    for (const p of urls.sitemapPaths.filter((x) => !removed.has(x) && !redirected.has(x))) {
      expect(sitemap.includes(`${urls.base}${p}`), p).toBe(true);
    }
    for (const p of redirected) {
      expect(sitemap.includes(`${urls.base}${p}`), `${p} should not be in the sitemap`).toBe(false);
    }
  });
});

describeIfBuilt('metadata parity', () => {
  const cases = Object.entries(metadata.pages).filter(
    ([p, record]) => record.status === 200 && p.endsWith('/') && existsSync(distFile(p)),
  );

  it.each(cases)('%s keeps its head metadata', (pathname, record) => {
    const html = readHtml(pathname);
    if (record.titleNormalised ?? record.title) {
      expect(normaliseTitle(decode(title(html)))).toBe(
        normaliseTitle(record.titleNormalised ?? record.title ?? null),
      );
    }
    if (record.description) expect(decode(meta(html, 'description'))).toBe(record.description);
    if (record.descriptionPrefix) {
      expect(decode(meta(html, 'description'))?.startsWith(record.descriptionPrefix)).toBe(true);
    }
    if (record.canonical) expect(linkHref(html, 'canonical')).toBe(record.canonical);
    if (record.ogType) expect(meta(html, 'og:type')).toBe(record.ogType);
    expect(meta(html, 'robots')).toBe(metadata.commonHead.robots);
    if (record.jsonLdTypes) {
      for (const type of record.jsonLdTypes) {
        expect(jsonLdTypes(html), `${pathname} JSON-LD ${type}`).toContain(type);
      }
    }
  });

  it('emits the common head set on every page', () => {
    const keys = Object.entries(metadata.commonHead);
    for (const file of allHtmlFiles(DIST)) {
      const html = readFileSync(file, 'utf8');
      if (!html.includes('<title>')) continue;
      for (const [key, value] of keys) {
        expect(meta(html, key), `${path.relative(DIST, file)} ${key}`).toBe(value);
      }
    }
  });

  it('gives every page exactly one canonical with a trailing slash', () => {
    for (const file of allHtmlFiles(DIST)) {
      const html = readFileSync(file, 'utf8');
      const canonical = linkHref(html, 'canonical');
      if (file.endsWith('404.html')) continue;
      expect(canonical, path.relative(DIST, file)).toMatch(
        /^https:\/\/carinyaparc\.com\.au\/([^?#]*\/)?$/,
      );
    }
  });
});
