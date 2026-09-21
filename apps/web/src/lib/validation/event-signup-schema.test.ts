import { describe, expect, it } from 'vitest';

import { eventSignupClientSchema, eventSignupSchema } from './event-signup-schema';

describe('eventSignupSchema', () => {
  const valid = {
    eventSlug: 'winter-planting-day',
    name: 'Alex Farmer',
    email: 'alex@fastmail.com',
    website: '',
    submissionTime: 5000,
  };

  it('accepts a valid signup payload', () => {
    expect(eventSignupSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a missing event slug', () => {
    const result = eventSignupSchema.safeParse({ ...valid, eventSlug: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a slug that is not kebab-case', () => {
    const result = eventSignupSchema.safeParse({ ...valid, eventSlug: 'Winter Planting' });
    expect(result.success).toBe(false);
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
      eventSlug: 'open-day',
      name: 'Alex',
      email: 'alex@fastmail.com',
    });
    expect(result.success).toBe(true);
  });
});
