/**
 * Built pages place the farm at The Branch, near Stroud, in the Upper Hunter.
 * Run after `astro build` (`pnpm --filter web test:dist`).
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const PLACE = 'The Branch, near Stroud, in the Upper Hunter, NSW';
const SITE_DESCRIPTION = `Carinya Parc is a regenerative farm at ${PLACE}. Visit for a planting day or a small-group tour.`;
const POST_DESCRIPTION = `Why Carinya Parc chose cattle for regenerating pasture at ${PLACE}, and why the first mob is still a year away.`;

const WEB_ROOT = path.resolve(__dirname, '..');
const DIST_ROOT = path.join(WEB_ROOT, 'dist');
const DIST = existsSync(path.join(DIST_ROOT, 'client', 'index.html'))
  ? path.join(DIST_ROOT, 'client')
  : DIST_ROOT;

const built = existsSync(path.join(DIST, 'index.html'));
const describeIfBuilt = built ? describe : describe.skip;

function decode(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function metaContent(html: string, key: string): string {
  const pattern = new RegExp(`<meta\\s+(?:[^>]*?\\s)?(?:name|property)=["']${key}["'][^>]*>`, 'i');
  const tag = pattern.exec(html)?.[0];
  const content = tag ? /content=["']([^"']*)["']/i.exec(tag)?.[1] : undefined;
  if (!content) throw new Error(`missing meta ${key}`);
  return decode(content);
}

function readPage(pathname: string): string {
  return readFileSync(path.join(DIST, pathname, 'index.html'), 'utf8');
}

function visibleText(html: string): string {
  return decode(html)
    .replace(/<script[\s\S]*?<\/script[^>]*>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');
}

describe('visibleText', () => {
  it('drops script and style blocks when the end tag has space or attributes before the bracket', () => {
    const html = [
      '<p>Visible</p>',
      '<script>hidden</script >',
      '<script src="x">also hidden</script foo="bar">',
      '<script src="x">still hidden</script\t\n bar>',
      '<style>secret</style >',
      '<p>Still visible</p>',
    ].join('');
    const text = visibleText(html);

    expect(text).toContain('Visible');
    expect(text).toContain('Still visible');
    expect(text).not.toContain('hidden');
    expect(text).not.toContain('secret');
  });
});

describeIfBuilt('farm place', () => {
  it('uses the Upper Hunter place on the homepage meta and social descriptions', () => {
    const html = readPage('');

    expect(metaContent(html, 'description')).toBe(SITE_DESCRIPTION);
    expect(metaContent(html, 'og:description')).toBe(SITE_DESCRIPTION);
    expect(metaContent(html, 'twitter:description')).toBe(SITE_DESCRIPTION);
    expect(html).toMatch(/uppercase[^>]*>\s*Upper Hunter, NSW\s*</);
    expect(html).not.toMatch(/mid-north coast/i);
  });

  it('places the property page at The Branch, near Stroud, in the Upper Hunter', () => {
    const html = readPage('about/the-property');
    const text = visibleText(html);

    expect(text).toContain(
      `Carinya Parc is 42 hectares (approximately 104 acres) of gently undulating countryside at ${PLACE}.`,
    );
    expect(text).toContain(
      `Located at ${PLACE}, 5 km from Stroud, 70 km to Newcastle, and within easy reach of Barrington Tops National Park, Port Stephens, and the Great Lakes region.`,
    );
    expect(html).not.toMatch(/mid-north coast/i);
  });

  it('places the cattle post in the Upper Hunter without naming a breed in the description', () => {
    const html = readPage('blog/why-highland-cattle');
    const description = metaContent(html, 'description');

    expect(description).toBe(POST_DESCRIPTION);
    expect(metaContent(html, 'og:description')).toBe(POST_DESCRIPTION);
    expect(metaContent(html, 'twitter:description')).toBe(POST_DESCRIPTION);
    expect(description).not.toMatch(/highland|dexter|angus|lowline|mid-north coast/i);
  });
});
