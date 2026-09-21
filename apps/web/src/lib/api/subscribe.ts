import { countMetric } from '@/lib/observability/metrics';
import {
  buildMailerLiteSubscriberPayload,
  upsertMailerLiteSubscriber,
} from '@/lib/mailerlite/client';
import { jsonResponse, readJsonBody } from '@/lib/api/json';
import { createRateLimiter } from '@/lib/rate-limit';
import { subscribeFormSchema } from '@/lib/validation/subscribe-schema';
import { isSpamEmail } from '@/lib/validation/spam-email';

const EMAIL_MAX_REQUESTS = 1;
const EMAIL_WINDOW_MS = 86_400_000;
const MIN_SUBMISSION_TIME_MS = 2000;

const emailRateLimiter = createRateLimiter({
  maxRequests: EMAIL_MAX_REQUESTS,
  windowMs: EMAIL_WINDOW_MS,
});

/** Test helper — clears the in-memory subscribe rate-limit map. */
export function resetSubscribeRateLimit(): void {
  emailRateLimiter.reset();
}

export async function handleSubscribePost(request: Request): Promise<Response> {
  try {
    const parsed = await readJsonBody(request);
    if (!parsed.ok) {
      return jsonResponse({ error: 'Failed to process request' }, 400);
    }

    const validation = subscribeFormSchema.safeParse(parsed.body);
    if (!validation.success) {
      const nameError = validation.error.issues.find((issue) => issue.path[0] === 'name');
      if (nameError) {
        return jsonResponse({ error: nameError.message }, 400);
      }

      const sourceError = validation.error.issues.find((issue) => issue.path[0] === 'source');
      if (sourceError) {
        return jsonResponse({ error: sourceError.message }, 400);
      }

      const interestError = validation.error.issues.find((issue) => issue.path[0] === 'interest');
      if (interestError) {
        return jsonResponse({ error: interestError.message }, 400);
      }

      return jsonResponse({ error: 'Please provide a valid email address' }, 400);
    }

    const { email, name, interest, interests, source, website, submissionTime } = validation.data;

    if (website) {
      countMetric('subscribe.submissions', 1, { status: 'spam' });
      return jsonResponse({ success: true }, 200);
    }

    if (typeof submissionTime === 'number' && submissionTime < MIN_SUBMISSION_TIME_MS) {
      countMetric('subscribe.submissions', 1, { status: 'spam' });
      return jsonResponse({ success: true }, 200);
    }

    if (isSpamEmail(email)) {
      countMetric('subscribe.submissions', 1, { status: 'spam' });
      return jsonResponse({ success: true }, 200);
    }

    const emailLimitResult = emailRateLimiter.check(email);
    if (emailLimitResult.limited) {
      countMetric('subscribe.submissions', 1, { status: 'rate_limited' });
      return jsonResponse(
        { error: 'This email address has already been submitted recently.' },
        429,
      );
    }

    const subscriberData = buildMailerLiteSubscriberPayload({
      email,
      name,
      interest,
      interests,
      source,
    });

    const result = await upsertMailerLiteSubscriber(subscriberData);
    if (!result.ok) {
      countMetric('subscribe.submissions', 1, { status: 'failed' });
      return jsonResponse({ error: result.error }, result.status);
    }

    countMetric('subscribe.submissions', 1, { status: 'success' });
    return jsonResponse({ success: true }, 200);
  } catch (error) {
    console.error('Request parsing error:', error);
    return jsonResponse({ error: 'Failed to process request' }, 400);
  }
}

export { buildMailerLiteSubscriberPayload };
