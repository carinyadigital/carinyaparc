import { useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { trackSubscribeComplete, trackSubscribeStart } from '@/lib/analytics/client';
import { cn } from '@/lib/cn';
import { postSubscribe } from '@/lib/newsletter/client';
import {
  getSubscribeEmailError,
  LEGACY_INTEREST_MAP,
  SUBSCRIBE_INTEREST_OPTIONS,
  type SubscribeInterest,
} from '@/lib/newsletter/schema';

export type SubscribeFormVariant = 'page' | 'card' | 'compact' | 'band' | 'stay' | 'end';

export interface SubscribeFormProps {
  variant: SubscribeFormVariant;
  source?: string;
  className?: string;
  submitLabel?: string;
  showName?: boolean;
  showInterests?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  /** Static privacy line supplied by the Astro section. Hidden after a successful submit. */
  privacy?: ReactNode;
}

type Status = 'idle' | 'loading' | 'success' | 'error';

export function SubscribeForm(props: SubscribeFormProps) {
  if (props.variant === 'page') {
    return <PageSubscribeForm {...props} />;
  }
  if (props.variant === 'end') {
    return <EndSubscribeForm {...props} />;
  }
  return <InlineSubscribeForm {...props} />;
}

function PageSubscribeForm({
  source,
  showName = true,
  showInterests = true,
  onSuccess,
  onError,
  privacy,
}: SubscribeFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    interests: '',
    website: '',
  });
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [formLoadTime] = useState<number>(() => Date.now());

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    if (formData.website) {
      setTimeout(() => {
        setStatus('success');
        setFormData({ email: '', name: '', interests: '', website: '' });
      }, 1000);
      return;
    }

    const mappedInterest = formData.interests ? LEGACY_INTEREST_MAP[formData.interests] : undefined;

    const result = await postSubscribe({
      email: formData.email,
      name: formData.name || undefined,
      interest: mappedInterest,
      interests: formData.interests || undefined,
      source,
      website: '',
      submissionTime: Date.now() - formLoadTime,
    });

    if (result.ok) {
      setStatus('success');
      setFormData({ email: '', name: '', interests: '', website: '' });
      onSuccess?.();
      return;
    }

    setStatus('error');
    setErrorMessage(result.error);
    onError?.(new Error(result.error));
  };

  if (status === 'success') {
    return (
      <div className="px-6 py-8">
        <div className="mx-auto max-w-xl text-center lg:max-w-lg">
          <div className="mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-pill bg-eucalypt-50">
            <CheckCircle className="h-8 w-8 text-eucalypt-600" aria-hidden />
          </div>
          <h2 className="mt-5 font-heading text-[28px] font-normal text-eucalypt-600">
            You&apos;re in — thank you!
          </h2>
          <p className="mx-auto mt-2.5 max-w-md text-base leading-relaxed text-charcoal">
            We&apos;ve sent a confirmation email to your inbox. Please check your email to complete
            your subscription.
          </p>
          <Button
            type="button"
            className="mt-6"
            onClick={() => {
              setStatus('idle');
              setFormData({ email: '', name: '', interests: '', website: '' });
            }}
          >
            Subscribe another email →
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-8">
      <div className="mx-auto max-w-xl lg:max-w-lg">
        {status === 'error' && (
          <Alert variant="destructive" className="mb-6">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <p className="text-sm font-semibold">Unable to subscribe</p>
                <p className="mt-1 text-sm">{errorMessage}</p>
              </div>
            </div>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
            <div className="sm:col-span-2" aria-hidden="true" style={{ display: 'none' }}>
              <label htmlFor="website" className="block text-sm/6 font-semibold text-charcoal">
                Website
              </label>
              <div className="mt-2.5">
                <input
                  type="text"
                  name="website"
                  id="website"
                  value={formData.website}
                  onChange={handleInputChange}
                  tabIndex={-1}
                  autoComplete="off"
                  className="block w-full rounded-md bg-white px-3.5 py-2"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <FormField name="email" label="Email Address" required>
                <Input
                  type="email"
                  name="email"
                  id="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  disabled={status === 'loading'}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </FormField>
            </div>

            {showName && (
              <div className="sm:col-span-2">
                <FormField name="name" label="Your Name">
                  <Input
                    type="text"
                    name="name"
                    id="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    disabled={status === 'loading'}
                    placeholder="Your name"
                    autoComplete="name"
                  />
                </FormField>
              </div>
            )}

            {showInterests && (
              <div className="sm:col-span-2">
                <FormField name="interests" label="What interests you most about Carinya Parc?">
                  <Select
                    name="interests"
                    id="interests"
                    value={formData.interests}
                    onChange={handleInputChange}
                    disabled={status === 'loading'}
                  >
                    <option value="">Select your main interest</option>
                    {SUBSCRIBE_INTEREST_OPTIONS.map((option) => (
                      <option
                        key={option.value}
                        value={
                          option.value === 'restoration'
                            ? 'regeneration'
                            : option.value === 'regenerative-farming'
                              ? 'farming'
                              : option.value
                        }
                      >
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </FormField>
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-col">
            <Button
              type="submit"
              disabled={status === 'loading'}
              isLoading={status === 'loading'}
              className="w-full"
            >
              Subscribe to Our Newsletter
            </Button>
            {privacy}
          </div>
        </form>
      </div>
    </div>
  );
}

function InlineSubscribeForm({
  source = '',
  className,
  variant = 'card',
  submitLabel = 'Subscribe',
  privacy,
}: SubscribeFormProps) {
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<Status>('idle');
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

  const handleSubmit = async (e: FormEvent) => {
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
        {variant === 'compact' ? privacy : null}
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
        {privacy}
      </form>
    </aside>
  );
}

function EndSubscribeForm({ source = '', className, privacy }: SubscribeFormProps) {
  const [email, setEmail] = useState('');
  const [interest, setInterest] = useState<SubscribeInterest | ''>('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<Status>('idle');
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

  const handleSubmit = async (e: FormEvent) => {
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

          {privacy}
        </form>
      </div>
    </section>
  );
}
