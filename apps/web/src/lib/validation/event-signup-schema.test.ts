import { describe, expect, it } from 'vitest';

import { eventSignupClientSchema, eventSignupSchema } from './event-signup-schema';

describe('eventSignupSchema', () => {
  const valid = {
    eventId: 'spring-planting-day',
    name: 'Alex Farmer',
    email: 'alex@fastmail.com',
    website: '',
    submissionTime: 5000,
  };

  it('accepts a valid signup payload', () => {
    expect(eventSignupSchema.safeParse(valid).success).toBe(true);
  });

  it('requires the event slug', () => {
    expect(eventSignupSchema.safeParse({ ...valid, eventId: '  ' }).success).toBe(false);
    expect(eventSignupSchema.safeParse({ ...valid, eventId: 12 }).success).toBe(false);
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
      eventId: 'spring-planting-day',
      name: 'Alex',
      email: 'alex@fastmail.com',
    });
    expect(result.success).toBe(true);
  });
});
