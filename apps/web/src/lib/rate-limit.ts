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
  reset: () => void;
};

/**
 * In-memory rate limiter. Same shape as the previous per-instance map:
 * durable abuse control is a WAF rule at cut-over, not this store.
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

      record.count += 1;
      record.lastAttempt = now;
      map.set(key, record);

      const limited = record.count > maxRequests;
      return {
        limited,
        remainingRequests: Math.max(0, maxRequests - record.count),
        resetTime: record.lastAttempt + windowMs,
      };
    },
    reset() {
      map.clear();
    },
  };
}
