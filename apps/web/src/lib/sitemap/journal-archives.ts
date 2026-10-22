import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/** Tag and category archives. The journal index and its pagination are not archives of one topic. */
const JOURNAL_ARCHIVE_PATH = /^\/blog\/(?:tag|category)\/[^/]+\/$/;

/**
 * True when the document's robots meta allows indexing.
 * A missing robots tag keeps the default, which is indexable.
 */
export function robotsMetaAllowsIndex(html: string): boolean {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    if (!/\bname\s*=\s*["']robots["']/i.test(tag)) continue;
    const content = /\bcontent\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1] ?? '';
    return !/\bnoindex\b/i.test(content);
  }
  return true;
}

function builtHtml(distRoots: readonly string[], pathname: string): string | undefined {
  const relative = path.join(pathname.slice(1), 'index.html');
  for (const root of distRoots) {
    const full = path.join(root, relative);
    if (existsSync(full)) return readFileSync(full, 'utf8');
  }
  return undefined;
}

/**
 * Sitemap membership for one built URL.
 *
 * Journal archives are included only when their built HTML is indexable.
 * The page decides that with `noindex` once it knows the story count, and
 * this filter runs after those files are written. A missing archive file
 * fails the build so a thin page cannot stay in the sitemap unnoticed.
 * `/monitoring/` stays out, matching the tunnel route.
 */
export function includeInSitemap(pageUrl: string, distRoots: readonly string[]): boolean {
  if (pageUrl.includes('/monitoring/')) return false;

  const pathname = new URL(pageUrl).pathname;
  if (!JOURNAL_ARCHIVE_PATH.test(pathname)) return true;

  const html = builtHtml(distRoots, pathname);
  if (html === undefined) {
    throw new Error(
      `No built HTML for ${pathname} under ${distRoots.join(', ')}. The sitemap cannot tell whether this journal archive is indexable.`,
    );
  }
  return robotsMetaAllowsIndex(html);
}
