import { describe, expect, it } from 'vitest';

import { generateMetadata, generatePageMetadata } from './index';

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
