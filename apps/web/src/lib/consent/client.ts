import { readConsentCookie, writeConsentCookie } from './cookie';
import type { ConsentChoice, ConsentChoiceValue } from './types';

const listeners = new Set<(choice: ConsentChoice) => void>();

/** The visitor's current choice. Reads the cookie on every call, including a choice just made on this page. */
export function getConsent(): ConsentChoiceValue {
  return readConsentCookie();
}

/** Store the visitor's choice, then tell every listener. Later reads use the cookie, not a second copy. */
export function setConsent(choice: ConsentChoice): void {
  writeConsentCookie(choice);
  for (const listener of [...listeners]) {
    listener(choice);
  }
}

/** Subscribe to choices stored after this call. Returns a function that removes the listener. */
export function onConsentChange(listener: (choice: ConsentChoice) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
