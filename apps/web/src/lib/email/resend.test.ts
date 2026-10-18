import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { sendMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
}));

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

import { deliverEmail, verifyEmailServiceConfig } from './resend';
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

describe('deliverEmail', () => {
  const originalApiKey = process.env.RESEND_API_KEY;

  beforeEach(() => {
    process.env.RESEND_API_KEY = 're_test_key';
    sendMock.mockReset();
  });

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.RESEND_API_KEY;
    } else {
      process.env.RESEND_API_KEY = originalApiKey;
    }
  });

  it('logs a missing provider key and keeps that detail out of the returned error', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    delete process.env.RESEND_API_KEY;

    await expect(deliverEmail(message)).resolves.toEqual({
      success: false,
      error: 'Email service is not configured',
    });
    expect(errorSpy).toHaveBeenCalledWith(
      'Email service not configured: RESEND_API_KEY is not set',
    );
    expect(sendMock).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('returns a failure when the provider rejects the message', async () => {
    sendMock.mockResolvedValue({
      data: null,
      error: { name: 'application_error', statusCode: 500, message: 'rejected' },
    });

    await expect(deliverEmail(message)).resolves.toEqual({
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

    await expect(deliverEmail(message)).resolves.toEqual({
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
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    delete process.env.RESEND_API_KEY;
    delete process.env.CONTACT_EMAIL_RECIPIENT;

    const result = await verifyEmailServiceConfig();

    expect(result.configured).toBe(false);
    expect(result.errors).toEqual(['Email service is not configured']);
    expect(result.errors.join(' ')).not.toMatch(/RESEND_API_KEY|CONTACT_EMAIL/);
    expect(errorSpy).toHaveBeenCalledWith(
      'Email service not configured: RESEND_API_KEY is not set',
    );
    errorSpy.mockRestore();
  });
});
