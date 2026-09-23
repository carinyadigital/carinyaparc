import { describe, expect, it } from 'vitest';

import { createRateLimiter } from './rate-limit';

describe('createRateLimiter', () => {
  it('allows the first request and then limits once the cap is exceeded', () => {
    const limiter = createRateLimiter({ maxRequests: 1, windowMs: 60_000 });

    expect(limiter.check('a@example.com').limited).toBe(false);
    expect(limiter.check('a@example.com').limited).toBe(true);
  });

  it('tracks keys independently', () => {
    const limiter = createRateLimiter({ maxRequests: 1, windowMs: 60_000 });

    expect(limiter.check('one').limited).toBe(false);
    expect(limiter.check('two').limited).toBe(false);
  });

  it('reset() clears stored counts', () => {
    const limiter = createRateLimiter({ maxRequests: 1, windowMs: 60_000 });
    limiter.check('one');
    expect(limiter.check('one').limited).toBe(true);
    limiter.reset();
    expect(limiter.check('one').limited).toBe(false);
  });

  it('release() gives back an attempt that did not complete', () => {
    const limiter = createRateLimiter({ maxRequests: 1, windowMs: 60_000 });
    expect(limiter.check('a@example.com').limited).toBe(false);
    limiter.release('a@example.com');
    expect(limiter.check('a@example.com').limited).toBe(false);
    expect(limiter.check('a@example.com').limited).toBe(true);
  });
});
