import { getPublicEventBySlug } from '@/lib/events/catalog';
import {
  buildMailerLiteSubscriberPayload,
  resolveEventGroupId,
  upsertMailerLiteSubscriber,
} from '@/lib/mailerlite/client';
import { jsonResponse, readJsonBody } from '@/lib/api/json';
import { captureException, countMetric } from '@/lib/observability/metrics';
import { createRateLimiter } from '@/lib/rate-limit';
import { eventSignupSchema } from '@/lib/validation/event-signup-schema';
import { sanitizePlainText } from '@/lib/validation/sanitize';
import { isSpamEmail } from '@/lib/validation/spam-email';

const RATE_LIMIT_MAX = parseInt(process.env.EVENT_SIGNUP_RATE_LIMIT_MAX || '5', 10);
const RATE_LIMIT_WINDOW_HOURS = parseInt(
  process.env.EVENT_SIGNUP_RATE_LIMIT_WINDOW_HOURS || '24',
  10,
);
const RATE_LIMIT_WINDOW_MS = RATE_LIMIT_WINDOW_HOURS * 60 * 60 * 1000;
const MIN_SUBMISSION_TIME_MS = 2000;
const EVENT_SIGNUP_RATE_LIMITING = process.env.EVENT_SIGNUP_RATE_LIMITING !== 'false';

const rateLimiter = createRateLimiter({
  maxRequests: RATE_LIMIT_MAX,
  windowMs: RATE_LIMIT_WINDOW_MS,
});

const SUCCESS_MESSAGE = "You're signed up — see you on the day.";

/** Test helper — clears the in-memory event-signup rate-limit map. */
export function resetEventSignupRateLimit(): void {
  rateLimiter.reset();
}

export async function handleEventSignupPost(request: Request): Promise<Response> {
  let rateLimitKey: string | undefined;

  const releaseRateLimit = () => {
    if (!rateLimitKey) return;
    rateLimiter.release(rateLimitKey);
    rateLimitKey = undefined;
  };

  try {
    const parsed = await readJsonBody(request);
    if (!parsed.ok) {
      return jsonResponse({ error: 'Invalid request format' }, 400);
    }

    const validation = eventSignupSchema.safeParse(parsed.body);
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
      countMetric('event.signups', 1, { status: 'spam' });
      return jsonResponse({ success: true, message: SUCCESS_MESSAGE }, 200);
    }

    if (typeof data.submissionTime === 'number' && data.submissionTime < MIN_SUBMISSION_TIME_MS) {
      countMetric('event.signups', 1, { status: 'spam' });
      return jsonResponse({ success: true, message: SUCCESS_MESSAGE }, 200);
    }

    if (isSpamEmail(data.email)) {
      countMetric('event.signups', 1, { status: 'spam' });
      return jsonResponse({ success: true, message: SUCCESS_MESSAGE }, 200);
    }

    if (EVENT_SIGNUP_RATE_LIMITING) {
      const key = data.email.toLowerCase();
      const limited = rateLimiter.check(key).limited;
      if (limited) {
        countMetric('event.signups', 1, { status: 'rate_limited' });
        return jsonResponse(
          {
            error:
              'Rate limit exceeded. This email has already signed up for events recently. Please try again later.',
          },
          429,
        );
      }
      rateLimitKey = key;
    }

    const event = await getPublicEventBySlug(data.eventSlug);
    if (!event) {
      releaseRateLimit();
      return jsonResponse({ error: 'Event not found' }, 404);
    }

    if (event.startsAt.getTime() < Date.now()) {
      releaseRateLimit();
      return jsonResponse({ error: 'This event has already started' }, 400);
    }

    if (event.signupTarget) {
      releaseRateLimit();
      return jsonResponse({ error: 'This event uses an external signup' }, 400);
    }

    if (event.isFull) {
      releaseRateLimit();
      countMetric('event.signups', 1, { status: 'full' });
      return jsonResponse(
        {
          error: 'This event is full',
          full: true,
          message: 'This event is full — join the waitlist via subscribe.',
        },
        409,
      );
    }

    const name = sanitizePlainText(data.name);
    const email = sanitizePlainText(data.email).toLowerCase();

    const group = await resolveEventGroupId(event.slug);
    if (!group.ok || !group.groupId) {
      releaseRateLimit();
      countMetric('event.signups', 1, { status: 'failed' });
      return jsonResponse({ error: 'Failed to record your signup. Please try again.' }, 500);
    }

    const result = await upsertMailerLiteSubscriber(
      buildMailerLiteSubscriberPayload({
        email,
        name,
        source: `event:${event.slug}`,
        groups: [group.groupId],
      }),
    );

    if (!result.ok) {
      releaseRateLimit();
      console.error('Failed to record event signup:', result.error);
      captureException(new Error(result.error), {
        tags: { feature: 'event_signup', error_type: 'persist' },
        extra: { event_slug: event.slug },
      });
      countMetric('event.signups', 1, { status: 'failed' });
      return jsonResponse({ error: 'Failed to record your signup. Please try again.' }, 500);
    }

    rateLimitKey = undefined;
    console.log(`Event signup recorded for event ${event.slug} (${email.split('@')[1]})`);
    countMetric('event.signups', 1, { status: 'registered' });

    return jsonResponse(
      {
        success: true,
        status: 'registered',
        message: SUCCESS_MESSAGE,
      },
      200,
    );
  } catch (error) {
    releaseRateLimit();
    console.error('Unexpected error in event signup API:', error);
    captureException(error, {
      tags: { feature: 'event_signup', error_type: 'unexpected' },
    });
    countMetric('event.signups', 1, { status: 'failed' });
    return jsonResponse({ error: 'An unexpected error occurred. Please try again.' }, 500);
  }
}
