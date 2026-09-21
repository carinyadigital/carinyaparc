import { describe, expect, it } from 'vitest';

import { eventSignupClientSchema, eventSignupSchema } from './event-signup-schema';

describe('eventSignupSchema', () => {
  const valid = {
    eventId: 12,
    name: 'Alex Farmer',
    email: 'alex@fastmail.com',
    website: '',
    submissionTime: 5000,
  };

  it('accepts a valid signup payload', () => {
    expect(eventSignupSchema.safeParse(valid).success).toBe(true);
  });

  it('coerces string eventId to number', () => {
    const result = eventSignupSchema.safeParse({ ...valid, eventId: '42' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.eventId).toBe(42);
    }
  });

  it('rejects an empty name', () => {
    const result = eventSignupSchema.safeParse({ ...valid, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid email', () => {
    const result = eventSignupSchema.safeParse({ ...valid, email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('allows a filled honeypot through schema (route rejects silently)', () => {
    const result = eventSignupSchema.safeParse({ ...valid, website: 'https://spam.test' });
    expect(result.success).toBe(true);
  });

  it('client schema omits anti-bot fields', () => {
    const result = eventSignupClientSchema.safeParse({
      eventId: 1,
      name: 'Alex',
      email: 'alex@fastmail.com',
    });
    expect(result.success).toBe(true);
  });
});
