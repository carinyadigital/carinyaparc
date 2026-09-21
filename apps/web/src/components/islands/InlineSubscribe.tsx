import { useRef, useState } from 'react';
import { CheckCircle } from 'lucide-react';

import { SubscribePrivacyNote } from '@/components/subscribe/SubscribePrivacyNote';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { trackSubscribeComplete, trackSubscribeStart } from '@/lib/analytics';
import { postSubscribe } from '@/lib/subscribe/client';
import { getSubscribeEmailError } from '@/lib/validation/subscribe-schema';

export interface InlineSubscribeProps {
  source: string;
  className?: string;
}

export function InlineSubscribe({ source, className }: InlineSubscribeProps) {
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [emailError, setEmailError] = useState('');
  const [formError, setFormError] = useState('');
  const [formLoadTime] = useState(() => Date.now());
  const startedRef = useRef(false);

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
        <div aria-hidden="true" style={{ display: 'none' }}>
          <label htmlFor="inline-subscribe-website">Website</label>
          <input
            type="text"
            name="website"
            id="inline-subscribe-website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <FormField
            name="inline-subscribe-email"
            label="Email address"
            required
            error={emailError || undefined}
            className="min-w-0 flex-1"
          >
            <Input
              type="email"
              name="email"
              id="inline-subscribe-email"
              value={email}
              onFocus={markStarted}
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
          <Button
            type="submit"
            disabled={status === 'loading'}
            isLoading={status === 'loading'}
            className="mt-0 shrink-0 sm:mt-7"
          >
            Subscribe
          </Button>
        </div>

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
