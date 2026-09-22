import { describe, expect, it } from 'vitest';

import { generateRobots } from './robots';

describe('generateRobots', () => {
  it('indexes and follows by default, including the googlebot block', () => {
    const robots = generateRobots();

    expect(robots.index).toBe(true);
    expect(robots.follow).toBe(true);
    expect(robots.googleBot.index).toBe(true);
    expect(robots.googleBot.follow).toBe(true);
  });

  it('mirrors noindex onto the googlebot block so a more specific tag cannot override it', () => {
    const robots = generateRobots({ index: false });

    expect(robots.index).toBe(false);
    expect(robots.follow).toBe(true);
    expect(robots.googleBot.index).toBe(false);
    expect(robots.googleBot.follow).toBe(true);
  });

  it('keeps an explicit googlebot block when the caller supplies one', () => {
    const robots = generateRobots({
      index: false,
      googleBotOptions: {
        index: true,
        follow: false,
        'max-image-preview': 'standard',
      },
    });

    expect(robots.index).toBe(false);
    expect(robots.googleBot.index).toBe(true);
    expect(robots.googleBot.follow).toBe(false);
    expect(robots.googleBot['max-image-preview']).toBe('standard');
  });
});
