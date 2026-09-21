import { readConsentCookie } from '@/lib/consent/cookie';

/** Cached positive consent for the current page session. Reset in tests via `resetAnalyticsConsentCache`. */
let acceptedCache: true | null = null;

/**
 * Whether analytics may fire for this visitor.
 * Reads the client-visible consent cookie (no endpoint).
 * Caches only an `accepted` result so a later banner accept is still detected.
 */
export function hasAnalyticsConsent(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  if (acceptedCache === true) {
    return true;
  }

  if (readConsentCookie() === 'accepted') {
    acceptedCache = true;
    return true;
  }

  return false;
}

/** Call after the visitor accepts so in-page tracking can fire immediately. */
export function markAnalyticsConsentAccepted(): void {
  acceptedCache = true;
}

/** Test helper — clears the in-memory consent cache. */
export function resetAnalyticsConsentCache(): void {
  acceptedCache = null;
}
