import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/mailerlite/client', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/mailerlite/client')>('@/lib/mailerlite/client');
  return {
    ...actual,
    upsertMailerLiteSubscriber: vi.fn(),
  };
});

vi.mock('@/lib/observability/metrics', () => ({
  countMetric: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

import { upsertMailerLiteSubscriber } from '@/lib/mailerlite/client';

import { handleSubscribePost, resetSubscribeRateLimit } from './subscribe';

function jsonRequest(body: unknown): Request {
  return new Request('http://localhost/api/subscribe/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/subscribe', () => {
  beforeEach(() => {
    resetSubscribeRateLimit();
    vi.mocked(upsertMailerLiteSubscriber).mockResolvedValue({ ok: true, status: 200 });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 for invalid JSON', async () => {
    const req = new Request('http://localhost/api/subscribe/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{',
    });
    const response = await handleSubscribePost(req);
    expect(response.status).toBe(400);
  });

  it('returns 400 for an invalid email', async () => {
    const response = await handleSubscribePost(
      jsonRequest({ email: 'nope', submissionTime: 5000 }),
    );
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error).toMatch(/email/i);
  });

  it('returns 400 for an invalid interest enum', async () => {
    const response = await handleSubscribePost(
      jsonRequest({
        email: 'reader@carinyaparc.com.au',
        interest: 'farming',
        submissionTime: 5000,
      }),
    );
    expect(response.status).toBe(400);
  });

  it('returns 400 when source exceeds 200 characters', async () => {
    const response = await handleSubscribePost(
      jsonRequest({
        email: 'reader@carinyaparc.com.au',
        source: 's'.repeat(201),
        submissionTime: 5000,
      }),
    );
    expect(response.status).toBe(400);
  });

  it('silently succeeds on honeypot fill without calling MailerLite', async () => {
    const response = await handleSubscribePost(
      jsonRequest({
        email: 'bot@carinyaparc.com.au',
        website: 'http://spam.example',
        submissionTime: 5000,
      }),
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(upsertMailerLiteSubscriber).not.toHaveBeenCalled();
  });

  it('silently succeeds when submissionTime is too fast', async () => {
    const response = await handleSubscribePost(
      jsonRequest({
        email: 'fast@carinyaparc.com.au',
        submissionTime: 500,
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(upsertMailerLiteSubscriber).not.toHaveBeenCalled();
  });

  it('upserts to MailerLite with interest and source fields', async () => {
    const response = await handleSubscribePost(
      jsonRequest({
        email: 'blog.reader@carinyaparc.com.au',
        interest: 'community',
        source: 'blog:planting-day',
        submissionTime: 5000,
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(upsertMailerLiteSubscriber).toHaveBeenCalledTimes(1);
    expect(vi.mocked(upsertMailerLiteSubscriber).mock.calls[0]?.[0]).toEqual({
      email: 'blog.reader@carinyaparc.com.au',
      fields: {
        interest: 'community',
        interests: 'community',
        source: 'blog:planting-day',
      },
    });
  });

  it('accepts legacy interests from the standalone form', async () => {
    const response = await handleSubscribePost(
      jsonRequest({
        email: 'legacy.reader@carinyaparc.com.au',
        name: 'Jordan',
        interests: 'regeneration',
        website: '',
        submissionTime: 5000,
      }),
    );

    expect(response.status).toBe(200);
    expect(vi.mocked(upsertMailerLiteSubscriber).mock.calls[0]?.[0]).toEqual({
      email: 'legacy.reader@carinyaparc.com.au',
      fields: {
        name: 'Jordan',
        interest: 'restoration',
        interests: 'restoration',
      },
    });
  });
});

describe('upstream failures', () => {
  beforeEach(() => {
    resetSubscribeRateLimit();
  });

  it('hides configuration and server errors behind a generic message', async () => {
    vi.mocked(upsertMailerLiteSubscriber).mockResolvedValue({
      ok: false,
      status: 500,
      error: 'Newsletter service not configured. Please add MAILERLITE_API_KEY to .env.local',
    });
    const response = await handleSubscribePost(
      jsonRequest({ email: 'reviewer@fastmail.com', submissionTime: 9000 }),
    );
    expect(response.status).toBe(503);
    const body = (await response.json()) as { error: string };
    expect(body.error).not.toMatch(/MAILERLITE_API_KEY|\.env/);
  });

  it('passes validation-style upstream errors through', async () => {
    vi.mocked(upsertMailerLiteSubscriber).mockResolvedValue({
      ok: false,
      status: 422,
      error: 'Subscription failed: The email must be a valid email address.',
    });
    const response = await handleSubscribePost(
      jsonRequest({ email: 'reviewer2@fastmail.com', submissionTime: 9000 }),
    );
    expect(response.status).toBe(422);
  });
});
