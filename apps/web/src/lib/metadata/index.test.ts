import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_OG_IMAGE_ALT,
  DEFAULT_OG_IMAGE_HEIGHT,
  DEFAULT_OG_IMAGE_WIDTH,
} from '../constants';
import { generateMetadata, generatePageMetadata } from './index';

const heroHome = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../public/images/hero-home.jpg',
);

/** Baseline JPEG frame size, skipping APP segments by their length. */
function jpegSize(buffer: Buffer): { width: number; height: number } {
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    throw new Error('hero-home.jpg is not a JPEG');
  }
  let offset = 2;
  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) break;
    const marker = buffer[offset + 1] ?? 0;
    if (marker === 0xd8 || marker === 0x01) {
      offset += 2;
      continue;
    }
    const length = buffer.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xc2) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + length;
  }
  throw new Error('hero-home.jpg has no start-of-frame marker');
}

describe('generatePageMetadata', () => {
  it('returns title, description, and a trailing-slash canonical', () => {
    const metadata = generatePageMetadata({
      title: 'About',
      description: 'Our story',
      path: '/about',
    });

    expect(metadata.title).toBe('About');
    expect(metadata.description).toBe('Our story');
    expect(metadata.canonical).toMatch(/\/about\/$/);
    expect(metadata.openGraph.type).toBe('website');
  });

  it('adds article published time and authors only when the page is an article', () => {
    const metadata = generatePageMetadata({
      title: 'From MasterChef to Mud Boots',
      description: 'A journal post',
      path: '/blog/masterchef-to-mud-boots',
      type: 'article',
      publishedTime: '2026-01-15T00:00:00.000Z',
      authors: ['Jonno', '  '],
    });

    expect(metadata.openGraph.publishedTime).toBe('2026-01-15T00:00:00.000Z');
    expect(metadata.openGraph.authors).toEqual(['Jonno']);
  });

  it('drops article Open Graph fields on website pages', () => {
    const metadata = generatePageMetadata({
      title: 'About',
      description: 'Our story',
      path: '/about',
      publishedTime: '2026-01-15T00:00:00.000Z',
      authors: ['Jonno'],
    });

    expect(metadata.openGraph.type).toBe('website');
    expect(metadata.openGraph.publishedTime).toBeUndefined();
    expect(metadata.openGraph.authors).toBeUndefined();
  });

  it('keeps the site photograph at its real size when no hero is passed', () => {
    const file = jpegSize(readFileSync(heroHome));
    expect(file).toEqual({
      width: DEFAULT_OG_IMAGE_WIDTH,
      height: DEFAULT_OG_IMAGE_HEIGHT,
    });

    const metadata = generatePageMetadata({
      title: 'About',
      description: 'Our story',
      path: '/about',
    });
    const image = metadata.openGraph.images[0];

    expect(image?.url).toMatch(/\/images\/hero-home\.jpg$/);
    expect(image?.width).toBe(file.width);
    expect(image?.height).toBe(file.height);
    expect(image?.alt).toBe(DEFAULT_OG_IMAGE_ALT);
    expect(metadata.twitter.images).toEqual([image?.url]);
    expect(metadata.twitter.imageAlt).toBe(DEFAULT_OG_IMAGE_ALT);
  });

  it('stamps a passed 1200 by 630 crop and the photograph alt', () => {
    const imageAlt = 'Highland cattle in a paddock, the breed we are bringing to Carinya Parc';
    const metadata = generatePageMetadata({
      title: 'Why Highland cattle, and why they are not here yet - Blog - Carinya Parc',
      description: 'A journal post',
      path: '/blog/why-highland-cattle',
      type: 'article',
      image: '/_astro/highland-cattle.jpg',
      imageWidth: 1200,
      imageHeight: 630,
      imageAlt,
    });
    const image = metadata.openGraph.images[0];

    expect(image?.url).toMatch(/\/_astro\/highland-cattle\.jpg$/);
    expect(image?.width).toBe(1200);
    expect(image?.height).toBe(630);
    expect(image?.alt).toBe(imageAlt);
    expect(metadata.twitter.imageAlt).toBe(imageAlt);
  });

  it('marks the document noindex, follow and keeps googlebot in sync', () => {
    const metadata = generatePageMetadata({
      title: 'Page not found | Carinya Parc',
      description: 'This track does not lead anywhere.',
      path: '/404',
      noIndex: true,
    });

    expect(metadata.robots.index).toBe(false);
    expect(metadata.robots.follow).toBe(true);
    expect(metadata.robots.googleBot.index).toBe(false);
    expect(metadata.robots.googleBot.follow).toBe(true);
    expect(metadata.canonical).toMatch(/\/404\/$/);
  });

  it('omits the canonical when the caller asks not to emit one', () => {
    const metadata = generatePageMetadata({
      title: 'Page not found | Carinya Parc',
      description: 'This track does not lead anywhere.',
      path: '/404',
      noIndex: true,
      omitCanonical: true,
    });

    expect(metadata.canonical).toBeUndefined();
    expect(metadata.openGraph.url).toMatch(/\/404\/$/);
  });
});

describe('generateMetadata', () => {
  it('suffixes the site name onto a page title', () => {
    const metadata = generateMetadata({ pageTitle: 'Contact', path: '/contact' });

    expect(metadata.title).toBe('Contact | Carinya Parc');
    expect(metadata.robots.index).toBe(true);
    expect(metadata.robots.googleBot.index).toBe(true);
    expect(metadata.openGraph.images[0]?.width).toBe(DEFAULT_OG_IMAGE_WIDTH);
    expect(metadata.openGraph.images[0]?.height).toBe(DEFAULT_OG_IMAGE_HEIGHT);
    expect(metadata.openGraph.images[0]?.alt).toBe(DEFAULT_OG_IMAGE_ALT);
  });

  it('marks the document noindex and keeps googlebot in sync', () => {
    const metadata = generateMetadata({
      pageTitle: 'Preview',
      path: '/preview',
      noIndex: true,
    });

    expect(metadata.robots.index).toBe(false);
    expect(metadata.robots.follow).toBe(true);
    expect(metadata.robots.googleBot.index).toBe(false);
    expect(metadata.robots.googleBot.follow).toBe(true);
  });
});
