import { describe, expect, it } from 'vitest';

import {
  blogSubscribeSource,
  getSubscribeEmailError,
  LEGACY_INTEREST_MAP,
  resolveSubscribeInterest,
  SUBSCRIBE_INTEREST_OPTIONS,
  SUBSCRIBE_INTERESTS,
  subscribeFormSchema,
} from './subscribe-schema';

describe('subscribeFormSchema', () => {
  const validBase = {
    email: 'reader@example.com',
    submissionTime: 5000,
  };

  it('accepts email-only payloads from simple clients', () => {
    const result = subscribeFormSchema.safeParse({ email: 'reader@example.com' });
    expect(result.success).toBe(true);
  });

  it('accepts the standalone /subscribe/ legacy payload with interests', () => {
    const result = subscribeFormSchema.safeParse({
      ...validBase,
      name: 'Alex',
      interests: 'farming',
      website: '',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.interests).toBe('farming');
    }
  });

  it('accepts canonical interest and source for blog in-flow modules', () => {
    const result = subscribeFormSchema.safeParse({
      email: 'reader@example.com',
      interest: 'regenerative-farming',
      source: 'blog:winter-planting',
      website: '',
      submissionTime: 4000,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.interest).toBe('regenerative-farming');
      expect(result.data.source).toBe('blog:winter-planting');
    }
  });

  it.each([...SUBSCRIBE_INTERESTS])('accepts interest enum value %s', (interest) => {
    const result = subscribeFormSchema.safeParse({ ...validBase, interest });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown interest enum value', () => {
    const result = subscribeFormSchema.safeParse({
      ...validBase,
      interest: 'farming',
    });
    expect(result.success).toBe(false);
  });

  it('rejects source longer than 200 characters', () => {
    const result = subscribeFormSchema.safeParse({
      ...validBase,
      source: 'x'.repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = subscribeFormSchema.safeParse({
      email: 'not-an-email',
      submissionTime: 5000,
    });
    expect(result.success).toBe(false);
  });

  it('allows honeypot website values through schema (route handles silently)', () => {
    const result = subscribeFormSchema.safeParse({
      ...validBase,
      website: 'https://spam.example',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.website).toBe('https://spam.example');
    }
  });

  it('rejects invalid name characters', () => {
    const result = subscribeFormSchema.safeParse({
      ...validBase,
      name: 'Alex <script>',
    });
    expect(result.success).toBe(false);
  });
});

describe('resolveSubscribeInterest', () => {
  it('prefers canonical interest over legacy interests', () => {
    expect(resolveSubscribeInterest('produce', 'farming')).toBe('produce');
  });

  it.each(Object.entries(LEGACY_INTEREST_MAP))(
    'maps legacy interests %s → %s',
    (legacy, canonical) => {
      expect(resolveSubscribeInterest(undefined, legacy)).toBe(canonical);
    },
  );

  it('returns undefined for empty or unknown legacy interests', () => {
    expect(resolveSubscribeInterest(undefined, '')).toBeUndefined();
    expect(resolveSubscribeInterest(undefined, 'unknown-topic')).toBeUndefined();
    expect(resolveSubscribeInterest()).toBeUndefined();
  });
});

describe('SUBSCRIBE_INTEREST_OPTIONS', () => {
  it('exposes the five interest options with /subscribe/ labels', () => {
    expect(SUBSCRIBE_INTEREST_OPTIONS).toHaveLength(5);
    expect(SUBSCRIBE_INTEREST_OPTIONS.map((o) => o.value)).toEqual([...SUBSCRIBE_INTERESTS]);
    expect(SUBSCRIBE_INTEREST_OPTIONS.map((o) => o.label)).toEqual([
      'Ecological restoration',
      'Regenerative farming',
      'Community involvement',
      'Future produce',
      'Learning opportunities',
    ]);
  });
});

describe('blogSubscribeSource', () => {
  it('prefixes the post slug for attribution', () => {
    expect(blogSubscribeSource('winter-fencing-progress')).toBe('blog:winter-fencing-progress');
  });
});

describe('getSubscribeEmailError', () => {
  it('returns undefined for a valid email', () => {
    expect(getSubscribeEmailError('reader@example.com')).toBeUndefined();
  });

  it('returns an inline error for invalid email without needing a request', () => {
    expect(getSubscribeEmailError('not-an-email')).toBe('Please provide a valid email address');
    expect(getSubscribeEmailError('')).toBe('Please provide a valid email address');
  });
});
