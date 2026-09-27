/**
 * Placeholder addresses we refuse to store.
 *
 * Subscribe and event signup answer a match with a fake success and never call
 * MailerLite, so a loose pattern drops a real signup. Match the local-part or a
 * whole domain label only. A long Gmail address, a mobile number used as the
 * local-part, or a domain such as testing.com still has to be delivered.
 */
const SPAM_EMAIL_PATTERNS = [
  /^test@test\./i,
  /^example@/i,
  /@(?:example|test|temp|fake|invalid|localhost)(?:\.|$)/i,
];

export function isSpamEmail(email: string): boolean {
  return SPAM_EMAIL_PATTERNS.some((pattern) => pattern.test(email));
}
