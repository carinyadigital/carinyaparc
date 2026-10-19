import { describe, expect, it } from 'vitest';

import { contactUrl } from './urls';

describe('contactUrl', () => {
  it('returns the contact page with a trailing slash', () => {
    expect(contactUrl()).toBe('/contact/');
  });

  it('adds the inquiry the form pre-selects', () => {
    expect(contactUrl('tours')).toBe('/contact/?inquiry=tours');
    expect(contactUrl('volunteer')).toBe('/contact/?inquiry=volunteer');
    expect(contactUrl('partnership')).toBe('/contact/?inquiry=partnership');
  });
});
