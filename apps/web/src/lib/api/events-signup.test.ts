import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getPublicEventBySlug, resolveEventGroupId, upsertMailerLiteSubscriber } = vi.hoisted(
  () => ({
    getPublicEventBySlug: vi.fn(),
    resolveEventGroupId: vi.fn(),
    upsertMailerLiteSubscriber: vi.fn(),
  }),
);

vi.mock('@/lib/events/catalog', () => ({
  getPublicEventBySlug,
}));

vi.mock('@/lib/mailerlite/client', () => ({
  buildMailerLiteSubscriberPayload: (input: Record<string, unknown>) => input,
  resolveEventGroupId,
  upsertMailerLiteSubscriber,
}));

vi.mock('@/lib/observability/metrics', () => ({
  captureException: vi.fn(),
  countMetric: vi.fn(),
  captureMessage: vi.fn(),
}));

import { handleEventSignupPost, resetEventSignupRateLimit } from './events-signup';

function jsonRequest(body: unknown): Request {
  return new Request('http://localhost/api/events/signup/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const upcomingEvent = {
  slug: 'winter-planting-day',
  title: 'Winter planting day',
  startsAt: new Date('2030-06-15T23:00:00.000Z'),
  location: 'Carinya Parc, The Branch NSW',
  isFull: false,
};

describe('POST /api/events/signup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetEventSignupRateLimit();
    process.env.EVENT_SIGNUP_RATE_LIMITING = 'false';
    getPublicEventBySlug.mockResolvedValue(upcomingEvent);
    resolveEventGroupId.mockResolvedValue({ ok: true, status: 200, groupId: 'grp_1' });
    upsertMailerLiteSubscriber.mockResolvedValue({ ok: true, status: 200 });
  });

  afterEach(() => {
    delete process.env.EVENT_SIGNUP_RATE_LIMITING;
  });

  it('returns 400 for invalid JSON', async () => {
    const req = new Request('http://localhost/api/events/signup/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{',
    });
    const response = await handleEventSignupPost(req);
    expect(response.status).toBe(400);
  });

  it('returns 400 for invalid email', async () => {
    const response = await handleEventSignupPost(
      jsonRequest({
        eventSlug: 'winter-planting-day',
        name: 'Alex',
        email: 'nope',
        submissionTime: 5000,
      }),
    );
    expect(response.status).toBe(400);
  });

  it('silently accepts honeypot submissions', async () => {
    const response = await handleEventSignupPost(
      jsonRequest({
        eventSlug: 'winter-planting-day',
        name: 'Bot',
        email: 'bot@fastmail.com',
        website: 'https://spam.test',
        submissionTime: 5000,
      }),
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(upsertMailerLiteSubscriber).not.toHaveBeenCalled();
  });

  it('records a registration against the event MailerLite group', async () => {
    const response = await handleEventSignupPost(
      jsonRequest({
        eventSlug: 'winter-planting-day',
        name: 'Alex Farmer',
        email: 'alex@fastmail.com',
        website: '',
        submissionTime: 5000,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.status).toBe('registered');
    expect(resolveEventGroupId).toHaveBeenCalledWith('winter-planting-day');
    expect(upsertMailerLiteSubscriber).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'alex@fastmail.com',
        name: 'Alex Farmer',
        groups: ['grp_1'],
      }),
    );
  });

  it('returns 409 when the event is marked full', async () => {
    getPublicEventBySlug.mockResolvedValue({ ...upcomingEvent, isFull: true });

    const response = await handleEventSignupPost(
      jsonRequest({
        eventSlug: 'winter-planting-day',
        name: 'Alex Farmer',
        email: 'alex@fastmail.com',
        submissionTime: 5000,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.full).toBe(true);
    expect(upsertMailerLiteSubscriber).not.toHaveBeenCalled();
  });

  it('returns 404 when the event is missing', async () => {
    getPublicEventBySlug.mockResolvedValue(null);

    const response = await handleEventSignupPost(
      jsonRequest({
        eventSlug: 'missing-day',
        name: 'Alex Farmer',
        email: 'alex@fastmail.com',
        submissionTime: 5000,
      }),
    );

    expect(response.status).toBe(404);
  });

  it('does not spend the allowance when the signup is not recorded', async () => {
    upsertMailerLiteSubscriber.mockResolvedValue({
      ok: false,
      status: 500,
      error: 'Network error. Please try again later.',
    });

    const body = {
      eventSlug: 'winter-planting-day',
      name: 'Alex Farmer',
      email: 'alex@fastmail.com',
      submissionTime: 5000,
    };

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const failed = await handleEventSignupPost(jsonRequest(body));
      expect(failed.status).toBe(500);
    }

    upsertMailerLiteSubscriber.mockResolvedValue({ ok: true, status: 200 });
    const retried = await handleEventSignupPost(jsonRequest(body));
    expect(retried.status).toBe(200);
    expect(upsertMailerLiteSubscriber).toHaveBeenCalledTimes(6);
  });

  it('returns 400 when the event uses an external signup target', async () => {
    getPublicEventBySlug.mockResolvedValue({
      ...upcomingEvent,
      signupTarget: 'https://example.com/signup',
    });

    const response = await handleEventSignupPost(
      jsonRequest({
        eventSlug: 'winter-planting-day',
        name: 'Alex Farmer',
        email: 'alex@fastmail.com',
        submissionTime: 5000,
      }),
    );

    expect(response.status).toBe(400);
    expect(upsertMailerLiteSubscriber).not.toHaveBeenCalled();
  });
});
