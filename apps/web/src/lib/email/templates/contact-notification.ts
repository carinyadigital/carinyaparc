/**
 * Email template for contact form notifications
 */

import { sanitizeForEmailGeneration } from '@/lib/validation/sanitize';

/**
 * Generate HTML email template for contact form submission
 */
export function generateContactNotificationEmail(params: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  inquiryType: string;
  message: string;
  submittedAt: Date;
  sourceIP?: string;
  userAgent?: string;
}): string {
  // Sanitize all inputs before including in email
  const sanitized = sanitizeForEmailGeneration({
    firstName: params.firstName,
    lastName: params.lastName,
    email: params.email,
    phone: params.phone,
    inquiryType: params.inquiryType,
    message: params.message,
  });

  // Format timestamp in Australian timezone
  const formattedDate = new Intl.DateTimeFormat('en-AU', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Australia/Sydney',
  }).format(params.submittedAt);

  // Format inquiry type for display
  const inquiryTypeDisplay =
    sanitized.inquiryType === 'tours'
      ? 'Farm Tours'
      : sanitized.inquiryType.charAt(0).toUpperCase() + sanitized.inquiryType.slice(1);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Contact Form Inquiry - ${inquiryTypeDisplay}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
    <h1 style="color: #111827; margin: 0 0 8px 0; font-size: 24px;">New Contact Form Inquiry</h1>
    <p style="color: #6b7280; margin: 0; font-size: 14px;">Received: ${formattedDate}</p>
  </div>

  <div style="background-color: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
    <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 18px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">Contact Details</h2>
    
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0; color: #6b7280; font-weight: 500; width: 140px; vertical-align: top;">Name:</td>
        <td style="padding: 8px 0; color: #111827;">${sanitized.firstName} ${sanitized.lastName}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #6b7280; font-weight: 500; vertical-align: top;">Email:</td>
        <td style="padding: 8px 0; color: #111827;">
          <a href="mailto:${sanitized.email}" style="color: #2563eb; text-decoration: none;">${sanitized.email}</a>
        </td>
      </tr>
      ${
        sanitized.phone
          ? `
      <tr>
        <td style="padding: 8px 0; color: #6b7280; font-weight: 500; vertical-align: top;">Phone:</td>
        <td style="padding: 8px 0; color: #111827;">
          <a href="tel:${sanitized.phone}" style="color: #2563eb; text-decoration: none;">${sanitized.phone}</a>
        </td>
      </tr>`
          : ''
      }
      <tr>
        <td style="padding: 8px 0; color: #6b7280; font-weight: 500; vertical-align: top;">Inquiry Type:</td>
        <td style="padding: 8px 0; color: #111827;">
          <span style="background-color: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px; font-size: 14px; font-weight: 500;">
            ${inquiryTypeDisplay}
          </span>
        </td>
      </tr>
    </table>
  </div>

  <div style="background-color: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
    <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 18px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">Message</h2>
    <div style="color: #111827; white-space: pre-wrap; word-wrap: break-word;">
${sanitized.message}
    </div>
  </div>

  ${
    params.sourceIP || params.userAgent
      ? `
  <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; font-size: 12px; color: #6b7280;">
    <p style="margin: 0 0 8px 0; font-weight: 500; color: #4b5563;">System Information</p>
    ${params.sourceIP ? `<p style="margin: 4px 0;">IP Address: ${params.sourceIP}</p>` : ''}
    ${params.userAgent ? `<p style="margin: 4px 0;">User Agent: ${params.userAgent}</p>` : ''}
  </div>`
      : ''
  }

  <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center;">
    <p style="margin: 0;">
      This email was sent from the contact form at 
      <a href="https://carinyaparc.com.au/contact" style="color: #2563eb; text-decoration: none;">carinyaparc.com.au/contact</a>
    </p>
    <p style="margin: 8px 0 0 0;">
      To reply to this inquiry, simply respond to this email.
    </p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text email template (fallback for email clients that don't support HTML)
 */
export function generateContactNotificationText(params: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  inquiryType: string;
  message: string;
  submittedAt: Date;
  sourceIP?: string;
  userAgent?: string;
}): string {
  // Sanitize all inputs
  const sanitized = sanitizeForEmailGeneration({
    firstName: params.firstName,
    lastName: params.lastName,
    email: params.email,
    phone: params.phone,
    inquiryType: params.inquiryType,
    message: params.message,
  });

  // Format timestamp
  const formattedDate = new Intl.DateTimeFormat('en-AU', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Australia/Sydney',
  }).format(params.submittedAt);

  const inquiryTypeDisplay =
    sanitized.inquiryType === 'tours'
      ? 'Farm Tours'
      : sanitized.inquiryType.charAt(0).toUpperCase() + sanitized.inquiryType.slice(1);

  let text = `NEW CONTACT FORM INQUIRY
========================
Received: ${formattedDate}

CONTACT DETAILS
---------------
Name: ${sanitized.firstName} ${sanitized.lastName}
Email: ${sanitized.email}
${sanitized.phone ? `Phone: ${sanitized.phone}\n` : ''}Inquiry Type: ${inquiryTypeDisplay}

MESSAGE
-------
${params.message}

`;

  if (params.sourceIP || params.userAgent) {
    text += `
SYSTEM INFORMATION
------------------
${params.sourceIP ? `IP Address: ${params.sourceIP}\n` : ''}${params.userAgent ? `User Agent: ${params.userAgent}\n` : ''}
`;
  }

  text += `
--
This email was sent from the contact form at https://carinyaparc.com.au/contact
To reply to this inquiry, simply respond to this email.`;

  return text;
}
