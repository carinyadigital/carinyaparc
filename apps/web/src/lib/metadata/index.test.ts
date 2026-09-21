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
});

describe('generateMetadata', () => {
  it('suffixes the site name onto a page title', () => {
    const metadata = generateMetadata({ pageTitle: 'Contact', path: '/contact' });

    expect(metadata.title).toBe('Contact | Carinya Parc');
    expect(metadata.robots.index).toBe(true);
  });
});
