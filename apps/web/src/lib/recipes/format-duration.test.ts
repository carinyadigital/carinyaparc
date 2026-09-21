import { describe, expect, it } from 'vitest';

import { formatIsoDuration } from './format-duration';

describe('formatIsoDuration', () => {
  it('formats hours and minutes', () => {
    expect(formatIsoDuration('PT2H30M')).toBe('2 hr 30 min');
  });

  it('formats minutes only', () => {
    expect(formatIsoDuration('PT20M')).toBe('20 min');
  });

  it('returns null for empty values', () => {
    expect(formatIsoDuration(undefined)).toBeNull();
    expect(formatIsoDuration(null)).toBeNull();
  });
});
