import { sendContactNotification } from '@/lib/email/send-contact-notification';
import { countMetric, captureException } from '@/lib/observability/metrics';
import { createRateLimiter } from '@/lib/rate-limit';
import { jsonResponse, readJsonBody } from '@/lib/api/json';
import { contactFormSchema } from '@/lib/validation/contact-schema';
import { sanitizeContactFormData } from '@/lib/validation/sanitize';

const RATE_LIMIT_MAX = parseInt(process.env.CONTACT_RATE_LIMIT_MAX || '3', 10);
const RATE_LIMIT_WINDOW_HOURS = parseInt(process.env.CONTACT_RATE_LIMIT_WINDOW_HOURS || '24', 10);
const RATE_LIMIT_WINDOW_MS = RATE_LIMIT_WINDOW_HOURS * 60 * 60 * 1000;

const CONTACT_FORM_ENABLE = process.env.CONTACT_FORM_ENABLE !== 'false';
const CONTACT_FORM_RATE_LIMITING = process.env.CONTACT_FORM_RATE_LIMITING !== 'false';

const rateLimiter = createRateLimiter({
  maxRequests: RATE_LIMIT_MAX,
  windowMs: RATE_LIMIT_WINDOW_MS,
});

const SUCCESS_MESSAGE = "Thank you for your inquiry. We'll respond within 48 business hours.";

/** Test helper — clears the in-memory contact rate-limit map. */
export function resetContactRateLimit(): void {
  rateLimiter.reset();
}

export async function handleContactPost(request: Request): Promise<Response> {
  let rateLimitKey: string | undefined;

  try {
    if (!CONTACT_FORM_ENABLE) {
      return jsonResponse({ error: 'Contact form is temporarily disabled' }, 503);
    }

    const parsed = await readJsonBody(request);
    if (!parsed.ok) {
      return jsonResponse({ error: 'Invalid request format' }, 400);
    }

    const validation = contactFormSchema.safeParse(parsed.body);
    if (!validation.success) {
      return jsonResponse(
        {
          error: 'Validation failed',
          details: validation.error.format(),
        },
        400,
      );
    }

    const data = validation.data;

    if (data.website && data.website.length > 0) {
      console.log('Contact form submission rejected: honeypot triggered');
      countMetric('contact.submissions', 1, { status: 'spam' });
      return jsonResponse({ success: true, message: SUCCESS_MESSAGE }, 200);
    }

    if (data.submissionTime && data.submissionTime < 2000) {
      console.log('Contact form submission rejected: too fast');
      countMetric('contact.submissions', 1, { status: 'spam' });
      return jsonResponse({ success: true, message: SUCCESS_MESSAGE }, 200);
    }

    if (CONTACT_FORM_RATE_LIMITING) {
      const key = data.email.toLowerCase();
      const result = rateLimiter.check(key);
      if (result.limited) {
        console.log(`Contact form rate limit exceeded for: ${data.email.split('@')[1]}`);
        countMetric('contact.submissions', 1, { status: 'rate_limited' });
        return jsonResponse(
          {
            error:
              'Rate limit exceeded. This email address has already submitted an inquiry recently. Please try again in 24 hours.',
          },
          429,
        );
      }
      rateLimitKey = key;
    }

    const sourceIP = request.headers.get('x-forwarded-for') || 'Unknown';
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const sanitizedData = sanitizeContactFormData(data);

    const emailResult = await sendContactNotification({
      firstName: sanitizedData.firstName,
      lastName: sanitizedData.lastName,
      email: sanitizedData.email,
      phone: sanitizedData.phone,
      inquiryType: data.inquiryType,
      message: sanitizedData.message,
      website: data.website,
      submissionTime: data.submissionTime,
      sourceIP,
      userAgent,
    });

    if (!emailResult.success) {
      if (rateLimitKey) rateLimiter.release(rateLimitKey);
      rateLimitKey = undefined;
      console.error('Failed to send contact notification email:', emailResult.error);
      captureException(new Error(emailResult.error || 'Email send failed'), {
        tags: {
          feature: 'contact_form',
          inquiry_type: data.inquiryType,
        },
        extra: {
          email_domain: data.email.split('@')[1],
          error_message: emailResult.error,
        },
      });
      countMetric('contact.submissions', 1, { status: 'failed' });
      return jsonResponse(
        {
          error:
            'Failed to process your inquiry. Please try again or contact us directly at contact@carinyaparc.com.au',
        },
        500,
      );
    }

    console.log(
      `Contact form submitted successfully: ${data.inquiryType} inquiry from ${data.email.split('@')[1]}`,
    );
    rateLimitKey = undefined;
    countMetric('contact.submissions', 1, { status: 'success', inquiry_type: data.inquiryType });

    return jsonResponse({ success: true, message: SUCCESS_MESSAGE }, 200);
  } catch (error) {
    if (rateLimitKey) rateLimiter.release(rateLimitKey);
    console.error('Unexpected error in contact API route:', error);
    captureException(error, {
      tags: {
        feature: 'contact_form',
        error_type: 'unexpected',
      },
    });
    countMetric('contact.submissions', 1, { status: 'failed' });
    return jsonResponse(
      {
        error:
          'An unexpected error occurred. Please try again or contact us directly at contact@carinyaparc.com.au',
      },
      500,
    );
  }
}
