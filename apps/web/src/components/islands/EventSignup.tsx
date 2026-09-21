import { useState } from 'react';
import { CheckCircle } from 'lucide-react';

import { SubscribePrivacyNote } from '@/components/subscribe/SubscribePrivacyNote';
import { Button, buttonVariants } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { EVENTS_LISTING_SOURCE, trackEventSignupComplete } from '@/lib/analytics';
import { cn } from '@/lib/cn';
import { API_EVENT_SIGNUP_PATH } from '@/lib/urls';
import {
  eventSignupClientSchema,
  type EventSignupClientData,
} from '@/lib/validation/event-signup-schema';

export type EventSignupProps = {
  eventSlug: string;
  eventTitle: string;
  source?: string;
  isFull?: boolean;
  className?: string;
};

type SubmitResult = { ok: true; message: string } | { ok: false; error: string; full?: boolean };

async function postEventSignup(payload: {
  eventSlug: string;
  name: string;
  email: string;
  website: string;
  submissionTime: number;
}): Promise<SubmitResult> {
  try {
    const res = await fetch(API_EVENT_SIGNUP_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
      full?: boolean;
    };

    if (res.ok) {
      return { ok: true, message: data.message || "You're signed up — see you on the day." };
    }

    if (res.status === 409 || data.full) {
      return {
        ok: false,
        error: data.message || data.error || 'This event is full',
        full: true,
      };
    }

    return {
      ok: false,
      error: data.error || 'Failed to sign up. Please try again.',
    };
  } catch {
    return { ok: false, error: 'Network error. Please check your connection and try again.' };
  }
}

export function EventSignup({
  eventSlug,
  eventTitle,
  source = EVENTS_LISTING_SOURCE,
  isFull = false,
  className,
}: EventSignupProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'full'>('idle');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<'name' | 'email', string>>>({});
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [formLoadTime] = useState(() => Date.now());

  if (isFull || status === 'full') {
    return (
      <div className={cn('mt-6 border-t border-line pt-5', className)} aria-live="polite">
        <p className="text-[14.5px] leading-[1.55] text-charcoal">
          This event is full. Join the waitlist by subscribing — we&apos;ll invite you when a spot
          opens or the next day is announced.
        </p>
        <div className="mt-4">
          <a href="/subscribe/" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            Full — join the waitlist
          </a>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className={cn('mt-6 border-t border-line pt-5', className)} aria-live="polite">
        <div className="flex items-start gap-3">
          <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-eucalypt-600" aria-hidden />
          <div>
            <p className="font-heading text-[18px] font-normal text-eucalypt-700">
              You&apos;re signed up
            </p>
            <p className="mt-1 text-[14.5px] leading-[1.55] text-charcoal">
              {successMessage ||
                `Thanks — you're down for ${eventTitle}. We'll be in touch closer to the day.`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setFormError('');

    const clientPayload: EventSignupClientData = {
      eventSlug,
      name: name.trim(),
      email: email.trim(),
    };

    const parsed = eventSignupClientSchema.safeParse(clientPayload);
    if (!parsed.success) {
      const next: Partial<Record<'name' | 'email', string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === 'name' || key === 'email') {
          next[key] = issue.message;
        }
      }
      setFieldErrors(next);
      return;
    }

    if (website) {
      setStatus('success');
      setSuccessMessage("You're signed up — see you on the day.");
      return;
    }

    setStatus('loading');

    const result = await postEventSignup({
      eventSlug: parsed.data.eventSlug,
      name: parsed.data.name,
      email: parsed.data.email,
      website: '',
      submissionTime: Date.now() - formLoadTime,
    });

    if (result.ok) {
      trackEventSignupComplete({ event_id: parsed.data.eventSlug, source });
      setStatus('success');
      setSuccessMessage(result.message);
      setName('');
      setEmail('');
      return;
    }

    if (result.full) {
      setStatus('full');
      return;
    }

    setStatus('idle');
    setFormError(result.error);
  };

  return (
    <div className={cn('mt-6 border-t border-line pt-5', className)}>
      <p className="text-[13px] font-semibold text-bark">Sign up for this event</p>
      <form onSubmit={handleSubmit} className="mt-3" noValidate>
        <div aria-hidden="true" style={{ display: 'none' }}>
          <label htmlFor={`event-signup-website-${eventSlug}`}>Website</label>
          <input
            type="text"
            name="website"
            id={`event-signup-website-${eventSlug}`}
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <div className="flex flex-col gap-3">
          <FormField
            name={`event-signup-name-${eventSlug}`}
            label="Name"
            required
            error={fieldErrors.name}
          >
            <Input
              type="text"
              id={`event-signup-name-${eventSlug}`}
              name="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
              }}
              disabled={status === 'loading'}
              autoComplete="name"
              invalid={Boolean(fieldErrors.name)}
              aria-invalid={Boolean(fieldErrors.name)}
            />
          </FormField>

          <FormField
            name={`event-signup-email-${eventSlug}`}
            label="Email"
            required
            error={fieldErrors.email}
          >
            <Input
              type="email"
              id={`event-signup-email-${eventSlug}`}
              name="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }}
              disabled={status === 'loading'}
              autoComplete="email"
              placeholder="you@example.com"
              invalid={Boolean(fieldErrors.email)}
              aria-invalid={Boolean(fieldErrors.email)}
            />
          </FormField>

          <SubscribePrivacyNote className="mt-1" />

          <Button
            type="submit"
            disabled={status === 'loading'}
            isLoading={status === 'loading'}
            variant="bracken"
            size="sm"
            className="self-start"
          >
            Sign up
          </Button>
        </div>

        {formError ? (
          <p className="mt-3 text-sm font-medium text-destructive" role="alert">
            {formError}
          </p>
        ) : null}
      </form>
    </div>
  );
}
