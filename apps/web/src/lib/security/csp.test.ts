import { describe, expect, it } from 'vitest';

import { CSP_DIRECTIVES } from './constants';
import { buildCSPHeader, validateCSPConfig } from './csp';

describe('CSP_DIRECTIVES.BALANCED', () => {
  const balanced = CSP_DIRECTIVES.BALANCED;

  it('allows unsafe-inline scripts for prerendered inline scripts', () => {
    expect(balanced['script-src']).toContain("'unsafe-inline'");
    expect(balanced['script-src']).not.toContain("'strict-dynamic'");
  });

  it('does not use script-src-elem (avoids blocking parser-inserted scripts)', () => {
    expect(balanced['script-src-elem']).toBeUndefined();
  });

  it('allowlists Vercel Toolbar hosts per platform docs', () => {
    expect(balanced['script-src']).toContain('https://vercel.live');
    expect(balanced['style-src']).toContain('https://vercel.live');
    expect(balanced['img-src']).toContain('https://vercel.live');
    expect(balanced['img-src']).toContain('https://vercel.com');
    expect(balanced['font-src']).toContain('https://vercel.live');
    expect(balanced['font-src']).toContain('https://assets.vercel.com');
    expect(balanced['connect-src']).toContain('https://vercel.live');
    expect(balanced['connect-src']).toContain('wss://vercel.live');
    expect(balanced['connect-src']).toContain('wss://ws-us3.pusher.com');
    expect(balanced['frame-src']).toContain('https://vercel.live');
  });

  it('does not embed script hashes that would disable unsafe-inline', () => {
    const scriptSrc = balanced['script-src'] ?? [];
    expect(scriptSrc.some((source) => source.startsWith("'sha256-"))).toBe(false);
  });

  it('does not include unsafe-eval', () => {
    const scriptSrc = balanced['script-src'] ?? [];
    expect(scriptSrc).not.toContain("'unsafe-eval'");
  });

  it('allows unsafe-inline styles for prerendered inline stylesheets', () => {
    expect(balanced['style-src']).toContain("'unsafe-inline'");
  });

  it('allows same-origin connections for the Sentry tunnel without a new host', () => {
    expect(balanced['connect-src']).toContain("'self'");
    expect(balanced['connect-src']).toContain('https://*.sentry.io');
  });

  it('does not allowlist Google Fonts hosts (fonts are self-hosted)', () => {
    expect(balanced['style-src']).not.toContain('https://fonts.googleapis.com');
    expect(balanced['font-src']).not.toContain('https://fonts.gstatic.com');
  });
});

describe('buildCSPHeader', () => {
  it('builds an enforcing header without injecting a script nonce', () => {
    const result = buildCSPHeader({
      directives: CSP_DIRECTIVES.BALANCED,
      reportUri: '/api/csp-report',
    });

    expect(result.headerName).toBe('Content-Security-Policy');
    expect(result.nonce).toBe('');
    expect(result.headerValue).toContain("script-src 'self' 'unsafe-inline'");
    expect(result.headerValue).not.toMatch(/'nonce-/);
    expect(result.headerValue).toContain('report-uri /api/csp-report');
  });

  it('supports report-only mode', () => {
    const result = buildCSPHeader({
      directives: { 'default-src': ["'self'"] },
      reportOnly: true,
    });

    expect(result.headerName).toBe('Content-Security-Policy-Report-Only');
  });
});

describe('validateCSPConfig', () => {
  it('requires default-src', () => {
    expect(validateCSPConfig({ directives: { 'script-src': ["'self'"] } })).toBe(false);
    expect(validateCSPConfig({ directives: { 'default-src': ["'self'"] } })).toBe(true);
  });
});
