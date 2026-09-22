import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('astro:content', () => ({
  getCollection: vi.fn(),
  getEntry: vi.fn(),
}));

import { isPublished } from './posts';

const draft = { data: { draft: true } };
const published = { data: { draft: false } };

describe('isPublished', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('excludes a draft when the build is not the dev server', () => {
    vi.stubEnv('DEV', false);

    expect(isPublished(draft)).toBeFalsy();
    expect(isPublished(published)).toBe(true);
  });

  it('includes a draft when the dev server is running', () => {
    vi.stubEnv('DEV', true);

    expect(isPublished(draft)).toBeTruthy();
    expect(isPublished(published)).toBe(true);
  });
});
