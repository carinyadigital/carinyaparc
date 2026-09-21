import { useRef, useState } from 'react';
import { CheckCircle } from 'lucide-react';

import { SubscribePrivacyNote } from '@/components/subscribe/SubscribePrivacyNote';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/cn';
import { trackSubscribeComplete, trackSubscribeStart } from '@/lib/analytics';
import { postSubscribe } from '@/lib/subscribe/client';
import { getSubscribeEmailError } from '@/lib/validation/subscribe-schema';

export interface InlineSubscribeProps {
  source: string;
  className?: string;
  variant?: 'card' | 'compact' | 'band' | 'stay';
  submitLabel?: string;
}

export function InlineSubscribe({
  source,
  className,
  variant = 'card',
  submitLabel = 'Subscribe',
}: InlineSubscribeProps) {
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [emailError, setEmailError] = useState('');
  const [formError, setFormError] = useState('');
  const [formLoadTime] = useState(() => Date.now());
  const startedRef = useRef(false);
  const idSuffix = source.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');
  const fieldId = variant === 'card' ? 'inline-subscribe-email' : `subscribe-email-${idSuffix}`;
  const websiteId =
    variant === 'card' ? 'inline-subscribe-website' : `subscribe-website-${idSuffix}`;
  const isBand = variant === 'band' || variant === 'stay';
  const isStay = variant === 'stay';

  const markStarted = () => {
    if (startedRef.current) {
      return;
    }
    startedRef.current = true;
    trackSubscribeStart({ source });
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
      }, 400);
      return;
    }

    const result = await postSubscribe({
      email: email.trim(),
      source,
      website: '',
      submissionTime: Date.now() - formLoadTime,
    });

    if (result.ok) {
      trackSubscribeComplete({ source });
      setStatus('success');
      setEmail('');
      return;
    }

    setStatus('error');
    setFormError(result.error);
  };

  if (status === 'success') {
    if (isStay) {
      return (
        <div
          className={cn(
            'w-full max-w-md rounded-[18px] border border-fleece/30 bg-fleece/12 px-[26px] py-6',
            className,
          )}
          aria-live="polite"
        >
          <p className="font-heading text-[22px] text-fleece">Thanks for joining us</p>
          <p className="mt-2 text-[15px] text-inverse-muted">
            You&apos;re on the list. We&apos;ll be in touch soon with news from the paddock.
          </p>
        </div>
      );
    }

    if (variant !== 'card') {
      return (
        <p
          className={cn(
            'text-[15px] leading-relaxed',
            isBand ? 'text-fleece' : 'text-charcoal',
            className,
          )}
          aria-live="polite"
        >
          You&apos;re in — thank you. Please check your email to complete your subscription.
        </p>
      );
    }

    return (
      <aside
        className={`my-12 rounded-[18px] border border-eucalypt-200 bg-eucalypt-50 px-6 py-8 sm:px-8 ${className ?? ''}`}
        aria-live="polite"
      >
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-pill bg-fleece">
            <CheckCircle className="h-6 w-6 text-eucalypt-600" aria-hidden />
          </div>
          <div>
            <p className="font-heading text-[22px] font-normal text-eucalypt-700">
              You&apos;re in — thank you!
            </p>
            <p className="mt-1 text-[15px] leading-relaxed text-charcoal">
              We&apos;ve sent a confirmation email to your inbox. Please check your email to
              complete your subscription.
            </p>
          </div>
        </div>
      </aside>
    );
  }

  const fields = (
    <>
      <div aria-hidden="true" style={{ display: 'none' }}>
        <label htmlFor={websiteId}>Website</label>
        <input
          type="text"
          name="website"
          id={websiteId}
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <FormField
        name={fieldId}
        label="Email address"
        required
        hideLabel={variant !== 'card'}
        error={emailError || undefined}
        className={cn('min-w-0 flex-1', variant !== 'card' && 'space-y-0')}
      >
        <Input
          type="email"
          name="email"
          id={fieldId}
          value={email}
          onFocus={markStarted}
          onChange={(e) => {
            markStarted();
            setEmail(e.target.value);
            if (emailError) setEmailError('');
          }}
          disabled={status === 'loading'}
          placeholder={
            isStay ? 'Enter your email address' : isBand ? 'Your email address' : 'you@example.com'
          }
          autoComplete="email"
          invalid={Boolean(emailError)}
          aria-invalid={Boolean(emailError)}
          className={
            isBand
              ? 'rounded-pill border-fleece/35 bg-fleece/10 px-5 py-3.5 text-fleece placeholder:text-fleece/60 focus:border-fleece/70'
              : variant === 'compact'
                ? 'rounded-pill px-[22px] py-[15px]'
                : undefined
          }
        />
      </FormField>
      <Button
        type="submit"
        disabled={status === 'loading'}
        isLoading={status === 'loading'}
        variant={isStay ? 'secondary' : isBand ? 'bracken' : 'primary'}
        className={cn('shrink-0', variant === 'card' ? 'mt-0 sm:mt-7' : '')}
      >
        {submitLabel}
      </Button>
    </>
  );

  if (variant !== 'card') {
    return (
      <div className={className}>
        <form
          onSubmit={handleSubmit}
          noValidate
          className={cn(
            'flex flex-col gap-3 sm:flex-row sm:items-start',
            isStay && 'w-full max-w-md',
            isBand && !isStay && 'min-w-[280px] max-w-[460px] flex-1',
          )}
        >
          {fields}
        </form>
        {formError ? (
          <p
            className={cn(
              'mt-3 text-sm font-medium',
              isStay ? 'text-bracken-200' : isBand ? 'text-wattle' : 'text-destructive',
            )}
            role="alert"
          >
            {formError}
          </p>
        ) : null}
        {isStay ? (
          <p className="mt-4 max-w-md text-sm/6 text-inverse-subtle">
            Join a growing community of supporters. Unsubscribe anytime. Read our{' '}
            <a href="/legal/privacy-policy/" className="font-semibold text-fleece hover:opacity-70">
              privacy&nbsp;policy
            </a>
            .
          </p>
        ) : null}
        {variant === 'compact' ? <SubscribePrivacyNote className="mt-4" /> : null}
      </div>
    );
  }

  return (
    <aside
      className={`my-12 rounded-[18px] border border-line bg-fleece px-6 py-8 sm:px-8 ${className ?? ''}`}
      aria-labelledby="inline-subscribe-heading"
    >
      <p
        id="inline-subscribe-heading"
        className="font-heading text-[26px] font-normal text-eucalypt-600"
      >
        Stay on the journey
      </p>
      <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-charcoal">
        Get seasonal updates from Carinya Parc — progress from the paddock, planting days, and
        stories from the land.
      </p>

      <form onSubmit={handleSubmit} className="mt-6" noValidate>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">{fields}</div>
        {formError && (
          <p className="mt-3 text-sm font-medium text-destructive" role="alert">
            {formError}
          </p>
        )}
        <SubscribePrivacyNote className="mt-4" />
      </form>
    </aside>
  );
}
