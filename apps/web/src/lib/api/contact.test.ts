import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/email/send-contact-notification', () => ({
  sendContactNotification: vi.fn(),
}));

vi.mock('@/lib/observability/metrics', () => ({
  countMetric: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

import { sendContactNotification } from '@/lib/email/send-contact-notification';

import { handleContactPost, resetContactRateLimit } from './contact';

function jsonRequest(body: unknown): Request {
  return new Request('http://localhost/api/contact/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const valid = {
  firstName: 'Alex',
  lastName: 'Farmer',
  email: 'alex@fastmail.com',
  phone: '',
  inquiryType: 'general' as const,
  message: 'I would like to visit the farm and learn about the restoration work you are doing.',
  website: '',
  submissionTime: 5000,
};

describe('handleContactPost', () => {
  beforeEach(() => {
    resetContactRateLimit();
    vi.mocked(sendContactNotification).mockResolvedValue({ success: true, messageId: 'msg_1' });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 for invalid JSON', async () => {
    const req = new Request('http://localhost/api/contact/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{',
    });
    const response = await handleContactPost(req);
    expect(response.status).toBe(400);
  });

  it('returns 400 for an invalid payload', async () => {
    const response = await handleContactPost(jsonRequest({ email: 'nope' }));
    expect(response.status).toBe(400);
  });

  it('silently succeeds on honeypot fill without sending email', async () => {
    const response = await handleContactPost(
      jsonRequest({ ...valid, website: 'https://spam.test' }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true });
    expect(sendContactNotification).not.toHaveBeenCalled();
  });

  it('sends a notification and returns confirmation', async () => {
    const response = await handleContactPost(jsonRequest(valid));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true });
    expect(sendContactNotification).toHaveBeenCalledTimes(1);
  });

  it('returns 500 when email sending fails', async () => {
    vi.mocked(sendContactNotification).mockResolvedValue({
      success: false,
      error: 'Email service is not configured',
    });
    const response = await handleContactPost(jsonRequest(valid));
    expect(response.status).toBe(500);
  });
});
