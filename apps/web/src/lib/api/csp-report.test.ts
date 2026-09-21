import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/observability/metrics', () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
  countMetric: vi.fn(),
}));

import { captureMessage } from '@/lib/observability/metrics';

import {
  handleCspReportGet,
  handleCspReportPost,
  isAllowedReportOrigin,
  resetCspReportCaptureWindow,
} from './csp-report';

function post(body: string): Request {
  return new Request('http://localhost/api/csp-report/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/csp-report' },
    body,
  });
}

describe('isAllowedReportOrigin', () => {
  it('allows the production hostname', () => {
    expect(isAllowedReportOrigin('https://carinyaparc.com.au/page/')).toBe(true);
    expect(isAllowedReportOrigin('https://www.carinyaparc.com.au/')).toBe(true);
  });

  it('allows localhost and loopback for development', () => {
    expect(isAllowedReportOrigin('http://localhost:3000/')).toBe(true);
    expect(isAllowedReportOrigin('http://127.0.0.1:3000/')).toBe(true);
  });

  it('allows Vercel preview deployments (*.vercel.app)', () => {
    expect(isAllowedReportOrigin('https://carinyaparccom-abc123-daddiaco.vercel.app/')).toBe(true);
    expect(isAllowedReportOrigin('https://some-preview.vercel.app/path/')).toBe(true);
  });

  it('rejects foreign domains', () => {
    expect(isAllowedReportOrigin('https://agwatch.app/get-involved/events/')).toBe(false);
    expect(isAllowedReportOrigin('https://evil.example/page/')).toBe(false);
    expect(isAllowedReportOrigin('https://not-vercel.app/')).toBe(false);
  });

  it('rejects undefined or unparseable document URIs', () => {
    expect(isAllowedReportOrigin(undefined)).toBe(false);
    expect(isAllowedReportOrigin('')).toBe(false);
    expect(isAllowedReportOrigin('not-a-url')).toBe(false);
  });
});

describe('POST /api/csp-report', () => {
  beforeEach(() => {
    vi.mocked(captureMessage).mockClear();
    resetCspReportCaptureWindow();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('accepts a legacy report-uri payload and forwards it to Sentry', async () => {
    const response = await handleCspReportPost(
      post(
        JSON.stringify({
          'csp-report': {
            'document-uri': 'https://carinyaparc.com.au/',
            'effective-directive': 'script-src',
            'blocked-uri': 'https://evil.example',
          },
        }),
      ),
    );

    expect(response.status).toBe(204);
    expect(captureMessage).toHaveBeenCalledOnce();
    const [, context] = vi.mocked(captureMessage).mock.calls[0]!;
    expect(context?.extra?.blockedUri).toBe('https://evil.example');
  });

  it('accepts a Reporting API payload', async () => {
    const response = await handleCspReportPost(
      post(
        JSON.stringify([
          {
            type: 'csp-violation',
            body: {
              documentURL: 'https://carinyaparc.com.au/',
              effectiveDirective: 'img-src',
              blockedURL: 'https://tracker.example/pixel.gif',
            },
          },
        ]),
      ),
    );

    expect(response.status).toBe(204);
    expect(captureMessage).toHaveBeenCalledOnce();
  });

  it('accepts reports from Vercel preview deployments', async () => {
    const response = await handleCspReportPost(
      post(
        JSON.stringify({
          'csp-report': {
            'document-uri': 'https://carinyaparccom-preview123-daddiaco.vercel.app/',
            'effective-directive': 'script-src',
            'blocked-uri': 'eval',
          },
        }),
      ),
    );

    expect(response.status).toBe(204);
    expect(captureMessage).toHaveBeenCalledOnce();
  });

  it('silently discards reports from foreign origins without forwarding to Sentry', async () => {
    const response = await handleCspReportPost(
      post(
        JSON.stringify({
          'csp-report': {
            'document-uri': 'https://agwatch.app/get-involved/events/',
            'violated-directive': 'script-src',
            'effective-directive': 'script-src',
            'blocked-uri': 'eval',
          },
        }),
      ),
    );

    expect(response.status).toBe(204);
    expect(captureMessage).not.toHaveBeenCalled();
  });

  it('silently discards a report with missing document-uri', async () => {
    const response = await handleCspReportPost(
      post(
        JSON.stringify({
          'csp-report': {
            'effective-directive': 'script-src',
            'blocked-uri': 'eval',
          },
        }),
      ),
    );

    expect(response.status).toBe(204);
    expect(captureMessage).not.toHaveBeenCalled();
  });

  it('rejects malformed JSON', async () => {
    const response = await handleCspReportPost(post('not json'));
    expect(response.status).toBe(400);
    expect(captureMessage).not.toHaveBeenCalled();
  });

  it('rejects payloads without a recognisable report', async () => {
    const response = await handleCspReportPost(post(JSON.stringify({ hello: 'world' })));
    expect(response.status).toBe(400);
    expect(captureMessage).not.toHaveBeenCalled();
  });

  it('rejects oversized payloads', async () => {
    const response = await handleCspReportPost(post('x'.repeat(40_000)));
    expect(response.status).toBe(413);
    expect(captureMessage).not.toHaveBeenCalled();
  });
});

describe('GET /api/csp-report', () => {
  it('returns 405', () => {
    const response = handleCspReportGet();
    expect(response.status).toBe(405);
  });
});
