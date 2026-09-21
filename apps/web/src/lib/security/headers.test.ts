import { describe, expect, it } from 'vitest';

import {
  createSecurityHeadersConfig,
  generateSecurityHeaders,
  validateSecurityHeadersConfig,
} from './headers';

describe('generateSecurityHeaders', () => {
  it('emits the production header set', () => {
    const headers = generateSecurityHeaders(createSecurityHeadersConfig());

    expect(headers['Strict-Transport-Security']).toBe(
      'max-age=63072000; includeSubDomains; preload',
    );
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['Permissions-Policy']).toBe('camera=(), microphone=(), geolocation=()');
  });
});

describe('validateSecurityHeadersConfig', () => {
  it('rejects an HSTS max-age shorter than one year', () => {
    const config = createSecurityHeadersConfig();
    config.hsts.maxAge = 60;
    expect(validateSecurityHeadersConfig(config)).toBe(false);
  });
});
