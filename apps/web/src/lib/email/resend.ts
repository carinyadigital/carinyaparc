import { Resend } from 'resend';

import type { EmailSendResult, OutboundEmail } from '@/lib/email/types';

// Use a placeholder key during build when the real key is absent.
const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder_key_for_build');

/** Send one message through Resend. The only function that talks to the provider. */
export async function deliverEmail(message: OutboundEmail): Promise<EmailSendResult> {
  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not configured');
    return {
      success: false,
      error: 'Email service is not configured',
    };
  }

  // Resend 6 forwards unknown request options onto fetch, but its public
  // options type does not include AbortSignal, so the signal is added here.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  const sendOptions: Parameters<typeof resend.emails.send>[1] & { signal: AbortSignal } = {
    signal: controller.signal,
  };

  try {
    const result = await resend.emails.send(
      {
        from: message.from,
        to: message.to,
        replyTo: message.replyTo,
        subject: message.subject,
        html: message.html,
        text: message.text,
        tags: message.tags,
      },
      sendOptions,
    );

    clearTimeout(timeoutId);

    // The SDK catches an aborted fetch and returns a generic error instead of throwing.
    if (controller.signal.aborted) {
      console.error('Email send timeout after 10 seconds');
      return {
        success: false,
        error: 'Email service timeout',
      };
    }

    if (result.error) {
      console.error('Resend API error:', result.error);
      return {
        success: false,
        error: 'Failed to send email notification',
      };
    }

    console.log(`Email sent successfully. Message ID: ${result.data?.id}`);

    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      console.error('Email send timeout after 10 seconds');
      return {
        success: false,
        error: 'Email service timeout',
      };
    }

    console.error('Failed to send email:', error);

    let errorMessage = 'Failed to send email notification';

    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        errorMessage = 'Email service rate limit exceeded';
      } else if (error.message.includes('authentication') || error.message.includes('API key')) {
        errorMessage = 'Email service authentication failed';
      } else if (error.message.includes('network') || error.message.includes('timeout')) {
        errorMessage = 'Email service is temporarily unavailable';
      }
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/** Verify the Resend key (for health checks). */
export async function verifyEmailServiceConfig(): Promise<{
  configured: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  if (!process.env.RESEND_API_KEY) {
    errors.push('RESEND_API_KEY is not configured');
  }

  if (process.env.RESEND_API_KEY && process.env.NODE_ENV === 'development') {
    try {
      const testResend = new Resend(process.env.RESEND_API_KEY);
      await testResend.domains.list();
    } catch {
      errors.push('RESEND_API_KEY is invalid or expired');
    }
  }

  return {
    configured: errors.length === 0,
    errors,
  };
}
