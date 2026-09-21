import { useRef, useState } from 'react';
import { CheckCircle } from 'lucide-react';

import { SubscribePrivacyNote } from '@/components/subscribe/SubscribePrivacyNote';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { trackSubscribeComplete, trackSubscribeStart } from '@/lib/analytics';
import { postSubscribe } from '@/lib/subscribe/client';
import {
  getSubscribeEmailError,
  SUBSCRIBE_INTEREST_OPTIONS,
  type SubscribeInterest,
} from '@/lib/validation/subscribe-schema';

export interface EndOfPostSubscribeProps {
  source: string;
  className?: string;
}

export function EndOfPostSubscribe({ source, className }: EndOfPostSubscribeProps) {
  const [email, setEmail] = useState('');
  const [interest, setInterest] = useState<SubscribeInterest | ''>('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [emailError, setEmailError] = useState('');
  const [formError, setFormError] = useState('');
  const [formLoadTime] = useState(() => Date.now());
  const startedRef = useRef(false);

  const markStarted = (nextInterest?: SubscribeInterest | '') => {
    if (startedRef.current) {
      return;
    }
    startedRef.current = true;
    const interestParam = nextInterest || interest || undefined;
    trackSubscribeStart({
      source,
      ...(interestParam ? { interest: interestParam } : {}),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setFormError('');

    const validationError = getSubscribeEmailError(email.trim());
    if (validationError) {
      setEmailError(validationError);
      setStatus('idle');
      return;
    }

    setStatus('loading');

    if (website) {
      setTimeout(() => {
        setStatus('success');
        setEmail('');
        setInterest('');
      }, 400);
      return;
    }

    const submittedInterest = interest || undefined;

    const result = await postSubscribe({
      email: email.trim(),
      source,
      interest: submittedInterest,
      website: '',
      submissionTime: Date.now() - formLoadTime,
    });

    if (result.ok) {
      trackSubscribeComplete({
        source,
        ...(submittedInterest ? { interest: submittedInterest } : {}),
      });
      setStatus('success');
      setEmail('');
      setInterest('');
      return;
    }

    setStatus('error');
    setFormError(result.error);
  };

  if (status === 'success') {
    return (
      <section className={`mx-auto max-w-[720px] px-6 py-12 ${className ?? ''}`} aria-live="polite">
        <div className="rounded-[18px] border border-eucalypt-200 bg-eucalypt-50 px-6 py-8 text-center sm:px-10">
          <div className="mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-pill bg-fleece">
            <CheckCircle className="h-8 w-8 text-eucalypt-600" aria-hidden />
          </div>
          <h2 className="mt-5 font-heading text-[28px] font-normal text-eucalypt-600">
            You&apos;re in — thank you!
          </h2>
          <p className="mx-auto mt-2.5 max-w-md text-base leading-relaxed text-charcoal">
            We&apos;ve sent a confirmation email to your inbox. Please check your email to complete
            your subscription.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`mx-auto max-w-[720px] px-6 py-12 ${className ?? ''}`}
      aria-labelledby="end-of-post-subscribe-heading"
    >
      <div className="rounded-[18px] border border-line bg-fleece px-6 py-8 sm:px-10">
        <p className="text-[13px] font-semibold uppercase tracking-[0.24em] text-bracken-500">
          Newsletter
        </p>
        <h2
          id="end-of-post-subscribe-heading"
          className="mt-3 font-heading text-[28px] font-normal text-eucalypt-600 sm:text-[32px]"
        >
          Keep reading from the paddock
        </h2>
        <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-charcoal">
          Subscribe for seasonal updates from Carinya Parc. Tell us what interests you most so we
          can send a more relevant welcome.
        </p>

        <form onSubmit={handleSubmit} className="mt-8" noValidate>
          <div aria-hidden="true" style={{ display: 'none' }}>
            <label htmlFor="end-subscribe-website">Website</label>
            <input
              type="text"
              name="website"
              id="end-subscribe-website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          <div className="grid grid-cols-1 gap-6">
            <FormField
              name="end-subscribe-email"
              label="Email address"
              required
              error={emailError || undefined}
            >
              <Input
                type="email"
                name="email"
                id="end-subscribe-email"
                value={email}
                onFocus={() => markStarted()}
                onChange={(e) => {
                  markStarted();
                  setEmail(e.target.value);
                  if (emailError) setEmailError('');
                }}
                disabled={status === 'loading'}
                placeholder="you@example.com"
                autoComplete="email"
                invalid={Boolean(emailError)}
                aria-invalid={Boolean(emailError)}
              />
            </FormField>

            <FormField
              name="end-subscribe-interest"
              label="What interests you most about Carinya Parc?"
            >
              <Select
                name="interest"
                id="end-subscribe-interest"
                value={interest}
                onFocus={() => markStarted()}
                onChange={(e) => {
                  const next = e.target.value as SubscribeInterest | '';
                  markStarted(next);
                  setInterest(next);
                }}
                disabled={status === 'loading'}
              >
                <option value="">Select your main interest</option>
                {SUBSCRIBE_INTEREST_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          {formError && (
            <p className="mt-4 text-sm font-medium text-destructive" role="alert">
              {formError}
            </p>
          )}

          <Button
            type="submit"
            disabled={status === 'loading'}
            isLoading={status === 'loading'}
            className="mt-8 w-full"
          >
            Subscribe to Our Newsletter
          </Button>

          <SubscribePrivacyNote className="mt-4 text-center" />
        </form>
      </div>
    </section>
  );
}
