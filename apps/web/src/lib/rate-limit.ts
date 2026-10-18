export type RateLimitRecord = {
  count: number;
  lastAttempt: number;
};

export type RateLimitResult = {
  limited: boolean;
  remainingRequests: number;
  resetTime: number;
};

export type RateLimiter = {
  check: (key: string) => RateLimitResult;
  /**
   * Undo one `check` that did not result in a stored signup or sent message.
   * A failed upstream call must not spend the allowance, or the visitor cannot retry.
   */
  release: (key: string) => void;
  reset: () => void;
};

/**
 * In-memory rate limiter keyed per function instance. Complements the
 * Vercel WAF rate-limit rule on the form endpoints; it is not a shared store.
 */
export function createRateLimiter(options: { maxRequests: number; windowMs: number }): RateLimiter {
  const map = new Map<string, RateLimitRecord>();
  const { maxRequests, windowMs } = options;

  const sweep = () => {
    const now = Date.now();
    for (const [key, record] of map.entries()) {
      if (now - record.lastAttempt > windowMs) {
        map.delete(key);
      }
    }
  };

  if (typeof setInterval === 'function') {
    const interval = setInterval(sweep, windowMs);
    interval.unref?.();
  }

  return {
    check(key: string): RateLimitResult {
      const now = Date.now();
      const record = map.get(key);

      if (!record || now - record.lastAttempt > windowMs) {
        map.set(key, { count: 1, lastAttempt: now });
        return {
          limited: false,
          remainingRequests: maxRequests - 1,
          resetTime: now + windowMs,
        };
      }

      // Do not count a request that is already over the cap. A duplicate submit
      // while the allowed request is in flight would otherwise leave the count
      // above the cap after that request releases, so a failed send cannot be retried.
      if (record.count >= maxRequests) {
        record.lastAttempt = now;
        return {
          limited: true,
          remainingRequests: 0,
          resetTime: now + windowMs,
        };
      }

      record.count += 1;
      record.lastAttempt = now;
      map.set(key, record);

      return {
        limited: false,
        remainingRequests: Math.max(0, maxRequests - record.count),
        resetTime: record.lastAttempt + windowMs,
      };
    },
    release(key: string) {
      const record = map.get(key);
      if (!record) return;
      record.count -= 1;
      if (record.count <= 0) map.delete(key);
    },
    reset() {
      map.clear();
    },
  };
}
