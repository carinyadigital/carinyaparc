import { describe, expect, it } from 'vitest';

import { contactUrl, regenerateUrl } from './urls';

describe('regenerateUrl', () => {
  it('returns the regenerate page with a trailing slash', () => {
    expect(regenerateUrl()).toBe('/regenerate/');
  });
});

describe('contactUrl', () => {
  it('returns the contact page with a trailing slash', () => {
    expect(contactUrl()).toBe('/contact/');
  });

  it('adds the inquiry the form pre-selects', () => {
    expect(contactUrl('tours')).toBe('/contact/?inquiry=tours');
    expect(contactUrl('volunteer')).toBe('/contact/?inquiry=volunteer');
  });
});
