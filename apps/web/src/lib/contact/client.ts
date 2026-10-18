import type { ContactFormData } from '@/lib/contact/schema';
import { sanitizeContactFormData } from '@/lib/validation/sanitize';
import { API_CONTACT_PATH } from '@/lib/urls';

export type ContactClientResult = { success: true; message: string };

/** POST a contact payload to `/api/contact/`. A non-OK response throws an Error with its HTTP status. */
export async function postContact(data: ContactFormData): Promise<ContactClientResult> {
  const sanitized = sanitizeContactFormData(data);
  const response = await fetch(API_CONTACT_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...sanitized,
      inquiryType: sanitized.inquiryType,
      website: data.website ?? '',
      submissionTime: data.submissionTime,
    }),
  });

  const result = (await response.json()) as { error?: string; message?: string; success?: boolean };

  if (!response.ok) {
    const error = new Error(result.error || 'Failed to submit form');
    // Keep the status on the error so the form can map a short code.
    throw Object.assign(error, { status: response.status });
  }

  return { success: true, message: result.message || 'Message sent' };
}
