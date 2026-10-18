import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { sendMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
}));

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

import { send, verifyEmailServiceConfig } from './index';
import type { OutboundEmail } from './types';

const message: OutboundEmail = {
  from: 'Carinya Parc <noreply@carinyaparc.com.au>',
  to: 'hello@carinyaparc.com.au',
  replyTo: 'alex@fastmail.com',
  subject: 'Hello from the farm',
  html: '<p>Hello</p>',
  text: 'Hello',
  tags: [{ name: 'source', value: 'contact_form' }],
};

describe('send', () => {
  const originalApiKey = process.env.RESEND_API_KEY;
  const originalRecipient = process.env.CONTACT_EMAIL_RECIPIENT;
  const originalFrom = process.env.CONTACT_EMAIL_FROM;

  beforeEach(() => {
    process.env.RESEND_API_KEY = 're_test_key';
    delete process.env.CONTACT_EMAIL_RECIPIENT;
    delete process.env.CONTACT_EMAIL_FROM;
    sendMock.mockReset();
  });

  afterEach(() => {
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
    if (originalFrom === undefined) {
      delete process.env.CONTACT_EMAIL_FROM;
    } else {
      process.env.CONTACT_EMAIL_FROM = originalFrom;
    }
  });

  it('returns a failure when the provider key is missing', async () => {
    delete process.env.RESEND_API_KEY;

    await expect(send(message)).resolves.toEqual({
      success: false,
      error: 'Email service is not configured',
    });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('returns a failure when the provider rejects the message', async () => {
    sendMock.mockResolvedValue({
      data: null,
      error: { name: 'application_error', statusCode: 500, message: 'rejected' },
    });

    await expect(send(message)).resolves.toEqual({
      success: false,
      error: 'Failed to send email notification',
    });
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: message.to, subject: message.subject }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('returns a failure when the provider throws', async () => {
    sendMock.mockRejectedValue(new Error('network unreachable'));

    await expect(send(message)).resolves.toEqual({
      success: false,
      error: 'Email service is temporarily unavailable',
    });
  });
});

describe('verifyEmailServiceConfig', () => {
  const originalApiKey = process.env.RESEND_API_KEY;
  const originalRecipient = process.env.CONTACT_EMAIL_RECIPIENT;

  afterEach(() => {
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

  it('reports the service configured from the provider key alone', async () => {
    process.env.RESEND_API_KEY = 're_test_key';
    delete process.env.CONTACT_EMAIL_RECIPIENT;

    await expect(verifyEmailServiceConfig()).resolves.toEqual({
      configured: true,
      errors: [],
    });
  });

  it('reports the provider key as missing without mentioning contact settings', async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.CONTACT_EMAIL_RECIPIENT;

    const result = await verifyEmailServiceConfig();

    expect(result.configured).toBe(false);
    expect(result.errors).toEqual(['RESEND_API_KEY is not configured']);
  });
});
