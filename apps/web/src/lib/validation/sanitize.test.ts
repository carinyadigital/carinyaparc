import { describe, expect, it } from 'vitest';

import { sanitizeForEmailGeneration, sanitizePlainText } from './sanitize';

describe('sanitizePlainText', () => {
  it('removes angle brackets after decoding HTML entities', () => {
    expect(sanitizePlainText('&lt;script&gt;alert(1)&lt;/script&gt;')).toBe(
      'scriptalert(1)/script',
    );
  });

  it('strips nested tag bypass payloads', () => {
    expect(sanitizePlainText('<scrip<script>t>alert(1)</script>t>')).toBe(
      'scripscripttalert(1)/scriptt',
    );
  });

  it('removes malformed close tags that regex parsers can miss', () => {
    expect(sanitizePlainText('<script>alert(1)</script foo="bar">')).toBe(
      'scriptalert(1)/script foo="bar"',
    );
  });
});

describe('sanitizeForEmailGeneration', () => {
  it('escapes plain-text fields embedded in HTML email templates', () => {
    const sanitized = sanitizeForEmailGeneration({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      inquiryType: 'general',
      message: 'Hello\nworld',
    });

    expect(sanitized.firstName).toBe('Jane');
    expect(sanitized.message).toBe('Hello<br>world');
  });

  it('escapes angle brackets in fields used for HTML output', () => {
    const sanitized = sanitizeForEmailGeneration({
      firstName: '<img src=x onerror=alert(1)>',
      lastName: 'Test',
      email: 'test@example.com',
      inquiryType: 'general',
      message: 'Safe message',
    });

    expect(sanitized.firstName).toBe('&lt;img src=x onerror=alert(1)&gt;');
  });
});
