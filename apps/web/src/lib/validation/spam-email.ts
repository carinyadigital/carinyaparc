const SPAM_EMAIL_PATTERNS = [
  /test@test/i,
  /example@/i,
  /\d{8,}@/i,
  /@(example|test|temp|fake|invalid|localhost)/i,
  /[a-z0-9]{20,}@/i,
];

export function isSpamEmail(email: string): boolean {
  return SPAM_EMAIL_PATTERNS.some((pattern) => pattern.test(email));
}
