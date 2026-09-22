import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { sendMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
}));

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

import { sendContactNotification } from './send-contact-notification';

const payload = {
  firstName: 'Alex',
  lastName: 'Farmer',
  email: 'alex@fastmail.com',
  phone: '',
  inquiryType: 'general' as const,
  message: 'I would like to visit the farm and learn about the restoration work you are doing.',
  website: '',
  submissionTime: 5000,
};

describe('sendContactNotification', () => {
  const originalApiKey = process.env.RESEND_API_KEY;
  const originalRecipient = process.env.CONTACT_EMAIL_RECIPIENT;

  beforeEach(() => {
    process.env.RESEND_API_KEY = 're_test_key';
    process.env.CONTACT_EMAIL_RECIPIENT = 'hello@carinyaparc.com.au';
    sendMock.mockReset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (originalApiKey === undefined) {
      delete process.env.RESEND_API_KEY;
    } else {
      process.env.RESEND_API_KEY = originalApiKey;
    }
    if (originalRecipient === undefined) {
      delete process.env.CONTACT_EMAIL_RECIPIENT;
    } else {
      process.env.CONTACT_EMAIL_RECIPIENT = originalRecipient;
    }
  });

  it('returns a timeout failure when the provider does not respond', async () => {
    sendMock.mockImplementation((_payload: unknown, options?: { signal?: AbortSignal }) => {
      return new Promise((resolve) => {
        const signal = options?.signal;
        const finish = () => {
          resolve({
            data: null,
            error: {
              name: 'application_error',
              statusCode: null,
              message: 'Unable to fetch data. The request could not be resolved.',
            },
          });
        };

        if (!signal) {
          return;
        }

        if (signal.aborted) {
          finish();
          return;
        }

        signal.addEventListener('abort', finish, { once: true });
      });
    });

    const pending = sendContactNotification(payload);
    await vi.advanceTimersByTimeAsync(10_000);

    await expect(pending).resolves.toEqual({
      success: false,
      error: 'Email service timeout',
    });
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'hello@carinyaparc.com.au' }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });
});
