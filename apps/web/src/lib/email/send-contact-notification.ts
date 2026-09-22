/**
 * Email service integration for contact form notifications
 */

import { Resend } from 'resend';
import {
  generateContactNotificationEmail,
  generateContactNotificationText,
} from './templates/contact-notification';
import type { ContactFormData } from '@/lib/validation/contact-schema';

// Initialize Resend client
// Use dummy key during build if not available
const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder_key_for_build');

/**
 * Email send result type
 */
export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send contact form notification email
 */
export async function sendContactNotification(
  data: ContactFormData & { sourceIP?: string; userAgent?: string },
): Promise<EmailSendResult> {
  // Validate required environment variables
  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not configured');
    return {
      success: false,
      error: 'Email service is not configured',
    };
  }

  if (!process.env.CONTACT_EMAIL_RECIPIENT) {
    console.error('CONTACT_EMAIL_RECIPIENT is not configured');
    return {
      success: false,
      error: 'Recipient email is not configured',
    };
  }

  const fromEmail = process.env.CONTACT_EMAIL_FROM || 'noreply@carinyaparc.com.au';
  const recipientEmail = process.env.CONTACT_EMAIL_RECIPIENT;
  const submittedAt = new Date();

  // Format inquiry type for email subject
  const inquiryTypeDisplay =
    data.inquiryType === 'tours'
      ? 'Farm Tours'
      : data.inquiryType.charAt(0).toUpperCase() + data.inquiryType.slice(1);

  try {
    // Generate email content
    const htmlContent = generateContactNotificationEmail({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      inquiryType: data.inquiryType,
      message: data.message,
      submittedAt,
      sourceIP: data.sourceIP,
      userAgent: data.userAgent,
    });

    const textContent = generateContactNotificationText({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      inquiryType: data.inquiryType,
      message: data.message,
      submittedAt,
      sourceIP: data.sourceIP,
      userAgent: data.userAgent,
    });

    // Send email using Resend SDK with 10-second timeout.
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
          from: `Carinya Parc <${fromEmail}>`,
          to: recipientEmail,
          replyTo: data.email, // Set reply-to header for easy response
          subject: `New ${inquiryTypeDisplay} Inquiry from ${data.firstName} ${data.lastName}`,
          html: htmlContent,
          text: textContent,
          tags: [
            { name: 'inquiry_type', value: data.inquiryType },
            { name: 'source', value: 'contact_form' },
          ],
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

      // Log successful delivery with message ID
      console.log(`Contact notification sent successfully. Message ID: ${result.data?.id}`);

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

      throw error;
    }
  } catch (error) {
    // Log error details for monitoring
    console.error('Failed to send contact notification email:', error);

    // Determine error message based on error type
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

/**
 * Verify email service configuration (for health checks)
 */
export async function verifyEmailServiceConfig(): Promise<{
  configured: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  if (!process.env.RESEND_API_KEY) {
    errors.push('RESEND_API_KEY is not configured');
  }

  if (!process.env.CONTACT_EMAIL_RECIPIENT) {
    errors.push('CONTACT_EMAIL_RECIPIENT is not configured');
  }

  // Optional: Test API key validity
  if (process.env.RESEND_API_KEY && process.env.NODE_ENV === 'development') {
    try {
      // This is a lightweight API call to verify the key
      const testResend = new Resend(process.env.RESEND_API_KEY);
      await testResend.domains.list(); // Simple API call to verify auth
    } catch {
      errors.push('RESEND_API_KEY is invalid or expired');
    }
  }

  return {
    configured: errors.length === 0,
    errors,
  };
}
