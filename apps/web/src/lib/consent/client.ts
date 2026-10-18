import {
  CONSENT_COOKIE_NAME,
  normalizeConsentChoice,
  type ConsentChoice,
  type ConsentChoiceValue,
} from './types';

const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function readCookieValue(name: string): string | undefined {
  if (typeof document === 'undefined') {
    return undefined;
  }

  const prefix = `${name}=`;
  const parts = document.cookie.split(';');

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }

  return undefined;
}

/** Read the visitor's analytics consent cookie. Missing or unknown values are `null`. */
export function readConsentCookie(): ConsentChoiceValue {
  return normalizeConsentChoice(readCookieValue(CONSENT_COOKIE_NAME));
}

/**
 * Persist analytics consent in a client-visible cookie.
 * Consent is not sensitive, so the cookie is not httpOnly — the gate reads it directly.
 */
export function writeConsentCookie(choice: ConsentChoice): void {
  if (typeof document === 'undefined') {
    return;
  }

  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(choice)}; Path=/; Max-Age=${CONSENT_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}
