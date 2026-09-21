import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { CSP_REPORT_ONLY_UNTIL_CUTOVER, CSP_REPORT_URI } from './constants';
import {
  GONE_PATH_PATTERNS,
  generateVercelJson,
  mergeSecurityIntoVercelOutput,
} from './vercel-config';

const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

describe('generateVercelJson', () => {
  const config = generateVercelJson();

  it('normalises trailing slashes at the CDN', () => {
    expect(config.trailingSlash).toBe(true);
  });

  it('redirects the root favicon to the hashed-free public file', () => {
    expect(config.redirects).toEqual([
      {
        source: '/favicon.ico',
        destination: '/favicon/favicon.ico',
        permanent: true,
      },
    ]);
  });

  it('ships HSTS, framing, referrer, permissions, and CSP on every path', () => {
    const headers = Object.fromEntries(
      config.headers[0]!.headers.map((entry) => [entry.key, entry.value]),
    );

    expect(headers['Strict-Transport-Security']).toContain('max-age=63072000');
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['Permissions-Policy']).toContain('camera=()');
    expect(headers['X-Content-Type-Options']).toBe('nosniff');

    const cspName = CSP_REPORT_ONLY_UNTIL_CUTOVER
      ? 'Content-Security-Policy-Report-Only'
      : 'Content-Security-Policy';
    expect(headers[cspName]).toContain("default-src 'self'");
    expect(headers[cspName]).toContain(`report-uri ${CSP_REPORT_URI}`);
    expect(headers[cspName]).toContain("'unsafe-inline'");
    expect(headers[cspName]).not.toContain('fonts.googleapis.com');
  });

  it('matches the committed vercel.json', () => {
    const committed = JSON.parse(
      readFileSync(path.join(WEB_ROOT, 'vercel.json'), 'utf8'),
    ) as unknown;
    expect(committed).toEqual(config);
  });
});

describe('mergeSecurityIntoVercelOutput', () => {
  it('prepends a continue header route and Gone patterns', () => {
    const merged = mergeSecurityIntoVercelOutput({
      version: 3,
      routes: [{ handle: 'filesystem' }],
    });

    expect(merged.routes?.[0]).toMatchObject({ src: '/(.*)', continue: true });
    const first = merged.routes?.[0] as { headers: Record<string, string> };
    expect(first.headers['X-Frame-Options']).toBe('DENY');
    expect(merged.routes?.slice(1, 1 + GONE_PATH_PATTERNS.length)).toEqual(
      GONE_PATH_PATTERNS.map((src) => ({ src, status: 410 })),
    );
    expect(merged.routes?.at(-1)).toEqual({ handle: 'filesystem' });
  });
});
