import { readFileSync } from 'node:fs';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  handleSentryTunnelGet,
  handleSentryTunnelPost,
  parseSentryIngestTarget,
  resetSentryTunnelRateLimit,
  SENTRY_TUNNEL_MAX_PER_WINDOW,
  sentryEnvelopeUrl,
  targetsMatch,
} from './sentry-tunnel';

const DSN = 'https://abc123@o1.ingest.sentry.io/99';

function envelope(dsn: string, extra: Uint8Array = new Uint8Array([0xff, 0x00])): Uint8Array {
  const header = new TextEncoder().encode(`${JSON.stringify({ dsn, event_id: 'evt' })}\n`);
  const body = new Uint8Array(header.length + extra.length);
  body.set(header, 0);
  body.set(extra, header.length);
  return body;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return copy;
}

function post(body: Uint8Array, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/monitoring/', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-sentry-envelope',
      'x-real-ip': '203.0.113.8',
      ...headers,
    },
    body: toArrayBuffer(body),
  });
}

describe('parseSentryIngestTarget', () => {
  it('accepts a regional Sentry ingest DSN', () => {
    expect(parseSentryIngestTarget(DSN)).toEqual({
      host: 'o1.ingest.sentry.io',
      projectId: '99',
      publicKey: 'abc123',
    });
    expect(parseSentryIngestTarget('https://abc123@sentry.io/99/')).toEqual({
      host: 'sentry.io',
      projectId: '99',
      publicKey: 'abc123',
    });
  });

  it('rejects non-Sentry, non-https, and incomplete DSNs', () => {
    expect(parseSentryIngestTarget('http://abc123@o1.ingest.sentry.io/99')).toBeNull();
    expect(parseSentryIngestTarget('https://abc123@169.254.169.254/99')).toBeNull();
    expect(parseSentryIngestTarget('https://abc123@o1.ingest.sentry.io.evil.com/99')).toBeNull();
    expect(parseSentryIngestTarget('https://abc123@notsentry.io/99')).toBeNull();
    expect(parseSentryIngestTarget('https://o1.ingest.sentry.io/99')).toBeNull();
    expect(parseSentryIngestTarget('https://abc123:secret@o1.ingest.sentry.io/99')).toBeNull();
    expect(parseSentryIngestTarget('https://abc123@o1.ingest.sentry.io/proj')).toBeNull();
    expect(parseSentryIngestTarget('not a url')).toBeNull();
  });
});

describe('sentry envelope url', () => {
  it('uses the configured host and project id', () => {
    const target = parseSentryIngestTarget(DSN);
    expect(target).not.toBeNull();
    expect(sentryEnvelopeUrl(target!)).toBe('https://o1.ingest.sentry.io/api/99/envelope/');
  });

  it('matches host, project, and public key together', () => {
    const configured = parseSentryIngestTarget(DSN)!;
    expect(targetsMatch(configured, configured)).toBe(true);
    expect(
      targetsMatch(parseSentryIngestTarget('https://abc123@o1.ingest.sentry.io/100')!, configured),
    ).toBe(false);
    expect(
      targetsMatch(parseSentryIngestTarget('https://other@o1.ingest.sentry.io/99')!, configured),
    ).toBe(false);
  });
});

describe('handleSentryTunnelPost', () => {
  const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();

  beforeEach(() => {
    resetSentryTunnelRateLimit();
    vi.stubEnv('SENTRY_DSN', DSN);
    vi.stubEnv('PUBLIC_SENTRY_DSN', '');
    fetchMock.mockResolvedValue(new Response('upstream-secret', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns 405 for GET', async () => {
    const response = handleSentryTunnelGet();
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('POST');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('forwards a matching envelope unchanged and hides the upstream body', async () => {
    const raw = envelope(DSN);
    const response = await handleSentryTunnelPost(post(raw));

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.text()).toBe('');
    expect(fetchMock).toHaveBeenCalledOnce();

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://o1.ingest.sentry.io/api/99/envelope/');
    expect(init?.method).toBe('POST');
    expect(init?.redirect).toBe('manual');
    expect(new Headers(init?.headers).get('content-type')).toBe('application/x-sentry-envelope');
    expect(new Uint8Array(init?.body as ArrayBuffer)).toEqual(raw);
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain('169.254.169.254');
  });

  it('keeps browser reporting on the tunnel and outside the analytics consent gate', () => {
    const source = readFileSync(
      new URL('../../../sentry.client.config.ts', import.meta.url),
      'utf8',
    );
    expect(source).toContain('tunnel: SENTRY_TUNNEL_PATH');
    expect(source).toContain('does not stop error reports');
    expect(source).not.toContain('cp_consent');
    expect(source).not.toMatch(/from ['"][^'"]*consent/);
  });

  it('does not forward an envelope aimed at another host, project, or key', async () => {
    const cases = [
      'https://abc123@evil.example/99',
      'https://abc123@169.254.169.254/latest',
      'http://abc123@o1.ingest.sentry.io/99',
      'https://abc123@o1.ingest.us.sentry.io/99',
      'https://abc123@o1.ingest.sentry.io/100',
      'https://other@o1.ingest.sentry.io/99',
    ];

    for (const [index, dsn] of cases.entries()) {
      const response = await handleSentryTunnelPost(
        post(envelope(dsn), { 'x-real-ip': `203.0.113.${20 + index}` }),
      );
      expect(response.status).toBe(400);
    }

    expect(fetchMock).not.toHaveBeenCalled();
    const logged = JSON.stringify(vi.mocked(console.warn).mock.calls);
    expect(logged).not.toContain('evil.example');
    expect(logged).not.toContain('169.254.169.254');
    expect(logged).toContain('dsn_rejected');
  });

  it('refuses to proxy when the configured DSN is not a Sentry ingest host', async () => {
    vi.stubEnv('SENTRY_DSN', 'https://abc123@example.com/99');
    const response = await handleSentryTunnelPost(
      post(envelope('https://abc123@example.com/99'), { 'x-real-ip': '203.0.113.40' }),
    );

    expect(response.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 503 when no DSN is configured', async () => {
    vi.stubEnv('SENTRY_DSN', '');
    vi.stubEnv('PUBLIC_SENTRY_DSN', '');
    const response = await handleSentryTunnelPost(
      post(envelope(DSN), { 'x-real-ip': '203.0.113.41' }),
    );
    expect(response.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects an empty or malformed envelope', async () => {
    const empty = await handleSentryTunnelPost(
      post(new Uint8Array(), { 'x-real-ip': '203.0.113.42' }),
    );
    const junk = await handleSentryTunnelPost(
      post(new TextEncoder().encode('not-an-envelope'), { 'x-real-ip': '203.0.113.43' }),
    );

    expect(empty.status).toBe(400);
    expect(junk.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects an oversized body before calling Sentry', async () => {
    const response = await handleSentryTunnelPost(
      post(envelope(DSN), { 'x-real-ip': '203.0.113.44' }),
      { maxBodyBytes: 8 },
    );

    expect(response.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rate limits a single client and does not include the envelope in the log', async () => {
    const raw = envelope(DSN, new TextEncoder().encode('private-envelope-body'));
    let limited: Response | undefined;

    for (let attempt = 0; attempt <= SENTRY_TUNNEL_MAX_PER_WINDOW; attempt += 1) {
      limited = await handleSentryTunnelPost(post(raw, { 'x-real-ip': '198.51.100.4' }));
    }

    expect(limited?.status).toBe(429);
    expect(fetchMock).toHaveBeenCalledTimes(SENTRY_TUNNEL_MAX_PER_WINDOW);
    const logged = JSON.stringify(vi.mocked(console.warn).mock.calls);
    expect(logged).toContain('rate_limited');
    expect(logged).not.toContain('private-envelope-body');
  });

  it('passes a Sentry error status through and turns a redirect into 502', async () => {
    fetchMock.mockResolvedValueOnce(new Response('nope', { status: 429 }));
    const limited = await handleSentryTunnelPost(
      post(envelope(DSN), { 'x-real-ip': '203.0.113.50' }),
    );
    expect(limited.status).toBe(429);
    expect(await limited.text()).toBe('');

    fetchMock.mockResolvedValueOnce(Response.redirect('https://evil.example/collect', 302));
    const redirected = await handleSentryTunnelPost(
      post(envelope(DSN), { 'x-real-ip': '203.0.113.51' }),
    );
    expect(redirected.status).toBe(502);
    expect(await redirected.json()).toEqual({ error: 'Could not deliver the report' });
  });

  it('returns 502 when the upstream request fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('https://o1.ingest.sentry.io/api/99/envelope/'));
    const response = await handleSentryTunnelPost(
      post(envelope(DSN), { 'x-real-ip': '203.0.113.52' }),
    );

    expect(response.status).toBe(502);
    const logged = JSON.stringify(vi.mocked(console.warn).mock.calls);
    expect(logged).toContain('fetch_failed');
    expect(logged).not.toContain('ingest.sentry.io');
  });
});
