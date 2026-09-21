import { describe, expect, it } from 'vitest';

import { ISO_8601_DURATION, RECIPE_DIFFICULTIES, SLUG_PATTERN } from './schema';

describe('ISO_8601_DURATION', () => {
  it.each(['PT20M', 'PT2H', 'PT2H30M', 'PT45S'])('accepts %s', (value) => {
    expect(ISO_8601_DURATION.test(value)).toBe(true);
  });

  it.each(['20M', 'P1D', 'PT', '', 'two hours'])('rejects %s', (value) => {
    expect(ISO_8601_DURATION.test(value)).toBe(false);
  });
});

describe('SLUG_PATTERN', () => {
  it.each(['jonno', 'field-reports', 'winter-fencing-progress'])('accepts %s', (value) => {
    expect(SLUG_PATTERN.test(value)).toBe(true);
  });

  it.each(['Jonno', 'field_reports', '-leading', 'trailing-', ''])('rejects %s', (value) => {
    expect(SLUG_PATTERN.test(value)).toBe(false);
  });
});

describe('RECIPE_DIFFICULTIES', () => {
  it('lists the three Payload difficulty values', () => {
    expect([...RECIPE_DIFFICULTIES]).toEqual(['easy', 'medium', 'hard']);
  });
});
