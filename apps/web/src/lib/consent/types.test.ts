import { describe, expect, it } from 'vitest';

import { normalizeConsentChoice } from './types';

describe('normalizeConsentChoice', () => {
  it('keeps accepted and rejected', () => {
    expect(normalizeConsentChoice('accepted')).toBe('accepted');
    expect(normalizeConsentChoice('rejected')).toBe('rejected');
  });

  it('returns null for anything else', () => {
    expect(normalizeConsentChoice(null)).toBeNull();
    expect(normalizeConsentChoice('maybe')).toBeNull();
    expect(normalizeConsentChoice(1)).toBeNull();
  });
});
