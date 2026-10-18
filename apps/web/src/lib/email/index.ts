import type { ContactFormData } from '@/lib/email/schema';
// Provider adapter. Replace this import to send contact mail through a different service.
import { deliverEmail, verifyEmailServiceConfig, type EmailSendResult } from '@/lib/email/resend';
import {
  generateContactNotificationEmail,
  generateContactNotificationText,
} from '@/lib/email/templates/contact-notification';

export type { EmailSendResult };
export { verifyEmailServiceConfig };

/** Send the contact-form notification to the site inbox. */
export async function sendContactNotification(
  data: ContactFormData & { sourceIP?: string; userAgent?: string },
): Promise<EmailSendResult> {
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

  const inquiryTypeDisplay =
    data.inquiryType === 'tours'
      ? 'Farm Tours'
      : data.inquiryType.charAt(0).toUpperCase() + data.inquiryType.slice(1);

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

  return deliverEmail({
    from: `Carinya Parc <${fromEmail}>`,
    to: recipientEmail,
    replyTo: data.email,
    subject: `New ${inquiryTypeDisplay} Inquiry from ${data.firstName} ${data.lastName}`,
    html: htmlContent,
    text: textContent,
    tags: [
      { name: 'inquiry_type', value: data.inquiryType },
      { name: 'source', value: 'contact_form' },
    ],
  });
}
