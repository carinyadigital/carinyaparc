import { describe, expect, it } from 'vitest';

import { CSP_REPORT_ONLY, CSP_REPORT_URI } from './constants';
import { generateVercelJson, mergeSecurityIntoVercelOutput } from './vercel-config';

describe('generateVercelJson', () => {
  const config = generateVercelJson();

  it('ships HSTS, framing, referrer, permissions, and CSP on every path', () => {
    const headers = Object.fromEntries(
      config.headers[0]!.headers.map((entry) => [entry.key, entry.value]),
    );

    expect(headers['Strict-Transport-Security']).toContain('max-age=63072000');
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['Permissions-Policy']).toContain('camera=()');
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['X-XSS-Protection']).toBeUndefined();

    const cspName = CSP_REPORT_ONLY
      ? 'Content-Security-Policy-Report-Only'
      : 'Content-Security-Policy';
    expect(headers[cspName]).toContain("default-src 'self'");
    expect(headers[cspName]).toContain(`report-uri ${CSP_REPORT_URI}`);
    expect(headers[cspName]).toContain("'unsafe-inline'");
    expect(headers[cspName]).not.toContain('fonts.googleapis.com');
  });
});

describe('mergeSecurityIntoVercelOutput', () => {
  it('prepends a continue header route', () => {
    const merged = mergeSecurityIntoVercelOutput({
      version: 3,
      routes: [{ handle: 'filesystem' }],
    });

    expect(merged.routes?.[0]).toMatchObject({ src: '/(.*)', continue: true });
    const first = merged.routes?.[0] as { headers: Record<string, string> };
    expect(first.headers['X-Frame-Options']).toBe('DENY');
    expect(first.headers['X-XSS-Protection']).toBeUndefined();
    expect(merged.routes).toHaveLength(2);
    expect(merged.routes?.at(-1)).toEqual({ handle: 'filesystem' });
  });
});
