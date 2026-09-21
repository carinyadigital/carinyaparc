import { describe, expect, it } from 'vitest';

import { generateCanonicalUrl, withTrailingSlash } from './canonical';

describe('withTrailingSlash', () => {
  it('keeps the root path as /', () => {
    expect(withTrailingSlash('/')).toBe('/');
    expect(withTrailingSlash('')).toBe('/');
  });

  it('appends a trailing slash when missing', () => {
    expect(withTrailingSlash('/blog')).toBe('/blog/');
    expect(withTrailingSlash('/blog/my-post')).toBe('/blog/my-post/');
  });

  it('leaves existing trailing slashes untouched', () => {
    expect(withTrailingSlash('/blog/')).toBe('/blog/');
  });
});

describe('generateCanonicalUrl', () => {
  it('emits trailing-slash URLs matching trailingSlash: always routing', () => {
    expect(generateCanonicalUrl('https://carinyaparc.com.au', '/blog')).toBe(
      'https://carinyaparc.com.au/blog/',
    );
    expect(generateCanonicalUrl('https://carinyaparc.com.au', '/blog/my-post')).toBe(
      'https://carinyaparc.com.au/blog/my-post/',
    );
    expect(generateCanonicalUrl('https://carinyaparc.com.au', '/')).toBe(
      'https://carinyaparc.com.au/',
    );
  });
});
