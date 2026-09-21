/**
 * Dist-output checks for Phase 5: internal links, images, CSP resource hosts,
 * security headers in the Vercel Build Output config, and hero loading hints.
 * Run after `astro build` (`pnpm --filter web test:dist`).
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { GONE_PATH_PATTERNS } from '../src/lib/security/vercel-config';

const WEB_ROOT = path.resolve(__dirname, '..');
const DIST_ROOT = path.join(WEB_ROOT, 'dist');
const DIST = existsSync(path.join(DIST_ROOT, 'client', 'index.html'))
  ? path.join(DIST_ROOT, 'client')
  : DIST_ROOT;
const VERCEL_CONFIG = path.join(WEB_ROOT, '.vercel/output/config.json');

const built = existsSync(DIST);
const describeIfBuilt = built ? describe : describe.skip;

function allHtmlFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return allHtmlFiles(full);
    return entry.endsWith('.html') ? [full] : [];
  });
}

function decode(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function collectAttrValues(html: string, attr: string): string[] {
  const values: string[] = [];
  const pattern = new RegExp(`\\s${attr}=["']([^"']+)["']`, 'gi');
  let match: RegExpExecArray | null = pattern.exec(html);
  while (match) {
    values.push(decode(match[1] ?? ''));
    match = pattern.exec(html);
  }
  return values;
}

function collectMetaContents(html: string, key: string): string[] {
  const values: string[] = [];
  const pattern = new RegExp(`<meta\\s+(?:[^>]*?\\s)?(?:name|property)=["']${key}["'][^>]*>`, 'gi');
  let match: RegExpExecArray | null = pattern.exec(html);
  while (match) {
    const content = /content=["']([^"']*)["']/i.exec(match[0]);
    if (content?.[1]) values.push(decode(content[1]));
    match = pattern.exec(html);
  }
  return values;
}

function expandSrcset(value: string): string[] {
  return value
    .split(',')
    .map((part) => part.trim().split(/\s+/)[0])
    .filter((url): url is string => Boolean(url));
}

const SKIP_SCHEMES = /^(mailto:|tel:|javascript:|data:|blob:)/i;

function isExternal(url: string): boolean {
  if (SKIP_SCHEMES.test(url)) return true;
  if (url.startsWith('//')) return true;
  if (/^https?:\/\//i.test(url)) {
    try {
      const { hostname } = new URL(url);
      return hostname !== 'carinyaparc.com.au' && hostname !== 'www.carinyaparc.com.au';
    } catch {
      return true;
    }
  }
  return false;
}

function toPathname(url: string): string | null {
  if (url.startsWith('#')) return null;
  let pathname = url;
  if (/^https?:\/\//i.test(url)) {
    pathname = new URL(url).pathname;
  }
  pathname = pathname.split('#')[0]?.split('?')[0] ?? pathname;
  if (!pathname.startsWith('/')) return null;
  return pathname;
}

function distExists(pathname: string): boolean {
  if (pathname === '/' || pathname === '') return existsSync(path.join(DIST, 'index.html'));
  if (pathname === '/404' || pathname === '/404/') return existsSync(path.join(DIST, '404.html'));
  const stripped = pathname.replace(/\/$/, '');
  const asFile = path.join(DIST, stripped);
  const asIndex = path.join(DIST, stripped, 'index.html');
  return existsSync(asFile) || existsSync(asIndex);
}

interface VercelOutput {
  routes?: Array<{
    src?: string;
    headers?: Record<string, string>;
    continue?: boolean;
    status?: number;
  }>;
}

describeIfBuilt('internal links and images', () => {
  it('resolves every internal href, src, srcset, and og:image against dist/', () => {
    const missing: string[] = [];

    for (const file of allHtmlFiles(DIST)) {
      const html = readFileSync(file, 'utf8');
      const relative = path.relative(DIST, file);
      const urls = [
        ...collectAttrValues(html, 'href'),
        ...collectAttrValues(html, 'src'),
        ...collectAttrValues(html, 'srcset').flatMap(expandSrcset),
        ...collectMetaContents(html, 'og:image'),
        ...collectMetaContents(html, 'twitter:image'),
      ];

      for (const url of urls) {
        if (!url || isExternal(url)) continue;
        const pathname = toPathname(url);
        if (!pathname) continue;
        if (!distExists(pathname)) {
          missing.push(`${relative} → ${pathname}`);
        }
      }
    }

    expect(missing).toEqual([]);
  });
});

describeIfBuilt('CSP first-party resources', () => {
  it('does not load first-party scripts, styles, or fonts from hosts outside the allowlist', () => {
    const allowedHosts = new Set([
      'www.googletagmanager.com',
      'www.google-analytics.com',
      'vercel.live',
      'vercel.com',
      'assets.vercel.com',
      'vitals.vercel-insights.com',
    ]);

    const blocked: string[] = [];

    for (const file of allHtmlFiles(DIST)) {
      const html = readFileSync(file, 'utf8');
      const urls = [
        ...collectAttrValues(html, 'src'),
        ...collectAttrValues(html, 'href'),
        ...collectAttrValues(html, 'srcset').flatMap(expandSrcset),
      ];

      for (const url of urls) {
        if (!/^https?:\/\//i.test(url)) continue;
        let hostname: string;
        try {
          hostname = new URL(url).hostname;
        } catch {
          continue;
        }
        if (hostname === 'carinyaparc.com.au' || hostname === 'www.carinyaparc.com.au') continue;
        if (hostname.endsWith('.vercel-scripts.com')) continue;
        if (hostname.endsWith('.sentry.io')) continue;
        if (hostname.endsWith('.google-analytics.com')) continue;
        if (hostname.endsWith('.googleusercontent.com')) continue;
        if (allowedHosts.has(hostname)) continue;
        if (
          url.includes('.js') ||
          url.includes('.css') ||
          url.includes('.woff') ||
          url.includes('font')
        ) {
          blocked.push(`${path.relative(DIST, file)} → ${url}`);
        }
      }
    }

    expect(blocked).toEqual([]);
  });
});

describeIfBuilt('hero image loading', () => {
  const cases: Array<{ pathname: string; label: string }> = [
    { pathname: '/', label: 'home' },
    { pathname: '/about/', label: 'about' },
    { pathname: '/regenerate/', label: 'regenerate' },
    { pathname: '/blog/', label: 'blog index' },
    { pathname: '/recipes/', label: 'recipes index' },
    { pathname: '/blog/why-highland-cattle/', label: 'post' },
    { pathname: '/recipes/winter-root-vegetable-stew/', label: 'recipe' },
  ];

  it.each(cases)('$label hero is eager with fetchpriority high and sizes', ({ pathname }) => {
    const file =
      pathname === '/' ? path.join(DIST, 'index.html') : path.join(DIST, pathname, 'index.html');
    const html = readFileSync(file, 'utf8');
    expect(html).toMatch(/fetchpriority=["']high["']/);
    expect(html).toMatch(/loading=["']eager["']/);
    expect(html).toMatch(/decoding=["']sync["']/);
    expect(html).toMatch(/\ssizes=["'][^"']+["']/);
  });
});

describeIfBuilt('Vercel output security config', () => {
  it('merges continue headers, Gone routes, and report-only CSP', () => {
    expect(existsSync(VERCEL_CONFIG)).toBe(true);
    const output = JSON.parse(readFileSync(VERCEL_CONFIG, 'utf8')) as VercelOutput;
    const headerRoute = output.routes?.find((route) => route.continue && route.headers);
    expect(headerRoute?.headers?.['X-Frame-Options']).toBe('DENY');
    expect(headerRoute?.headers?.['Strict-Transport-Security']).toContain('max-age=63072000');
    expect(headerRoute?.headers?.['Content-Security-Policy-Report-Only']).toContain(
      'report-uri /api/csp-report/',
    );
    expect(headerRoute?.headers?.['Content-Security-Policy']).toBeUndefined();

    for (const src of GONE_PATH_PATTERNS) {
      expect(output.routes?.some((route) => route.src === src && route.status === 410)).toBe(true);
    }
  });
});
