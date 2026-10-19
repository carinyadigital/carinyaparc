import { describe, expect, it } from 'vitest';

import { inquiryTypeFromSearch } from './schema';

describe('inquiryTypeFromSearch', () => {
  it('reads a known inquiry from the contact query', () => {
    expect(inquiryTypeFromSearch('?inquiry=tours')).toBe('tours');
    expect(inquiryTypeFromSearch('?inquiry=volunteer')).toBe('volunteer');
    expect(inquiryTypeFromSearch('?inquiry=partnership')).toBe('partnership');
  });

  it('ignores a missing or unknown inquiry', () => {
    expect(inquiryTypeFromSearch('')).toBeUndefined();
    expect(inquiryTypeFromSearch('?inquiry=stay')).toBeUndefined();
    expect(inquiryTypeFromSearch('?inquiry=TOURS')).toBeUndefined();
  });
});
