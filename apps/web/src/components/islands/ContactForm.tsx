import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle } from 'lucide-react';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { API_CONTACT_PATH } from '@/lib/urls';
import {
  contactFormClientSchema,
  type ContactFormClientData,
  type ContactFormData,
  type InquiryType,
} from '@/lib/validation/contact-schema';
import { sanitizeContactFormData } from '@/lib/validation/sanitize';

const INQUIRY_OPTIONS: { value: InquiryType; label: string }[] = [
  { value: 'partnership', label: 'A grant or partnership' },
  { value: 'volunteer', label: 'Volunteering / planting days' },
  { value: 'tours', label: 'Booking a tour or visit' },
  { value: 'general', label: 'Media, press, or something else' },
];

function trackContact(eventName: string, properties?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && 'va' in window) {
    (
      window as Window & {
        va?: (command: 'track', name: string, props?: Record<string, unknown>) => void;
      }
    ).va?.('track', eventName, properties);
  }
}

async function submitContact(
  data: ContactFormData,
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(API_CONTACT_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const result = (await response.json()) as { error?: string; message?: string; success?: boolean };

  if (!response.ok) {
    throw new Error(result.error || 'Failed to submit form');
  }

  return { success: true, message: result.message || 'Message sent' };
}

interface ContactFormProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function ContactForm({ onSuccess, onError }: ContactFormProps = {}) {
  const formLoadTime = useRef<number>(0);
  const [isFormReady, setIsFormReady] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    formLoadTime.current = Date.now();
    setIsFormReady(true);
    trackContact('contact_form_viewed');
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormClientData>({
    resolver: zodResolver(contactFormClientSchema),
    mode: 'onBlur',
  });

  const handleFormInteraction = () => {
    trackContact('contact_form_started');
  };

  const onSubmit = async (data: ContactFormClientData) => {
    trackContact('contact_form_submitted', { inquiry_type: data.inquiryType });
    setStatus('loading');
    setSubmitError('');

    const submissionTime = formLoadTime.current > 0 ? Date.now() - formLoadTime.current : 0;
    const sanitizedData = sanitizeContactFormData(data);

    const fullData: ContactFormData = {
      ...sanitizedData,
      inquiryType: sanitizedData.inquiryType as InquiryType,
      website: '',
      submissionTime,
    };

    try {
      await submitContact(fullData);
      trackContact('contact_form_success');
      reset();
      formLoadTime.current = Date.now();
      setStatus('success');
      onSuccess?.();
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to submit form');
      trackContact('contact_form_error', { error: err.message });
      setStatus('error');
      setSubmitError(err.message);
      onError?.(err);
    }
  };

  const isPending = status === 'loading' || isSubmitting;

  if (status === 'success') {
    return (
      <div className="px-2 py-8 text-center sm:px-4 sm:py-10">
        <div className="mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-pill bg-eucalypt-50">
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 3c.4 2.2 1.2 3.8 2.4 4.8C15.7 8.9 17.3 9.5 20 10c-2.7.5-4.3 1.1-5.6 2.2C13.2 13.2 12.4 14.8 12 17c-.4-2.2-1.2-3.8-2.4-4.8C8.3 11.1 6.7 10.5 4 10c2.7-.5 4.3-1.1 5.6-2.2C10.8 6.8 11.6 5.2 12 3Z"
              fill="currentColor"
              className="text-eucalypt-600"
            />
          </svg>
        </div>
        <h2 className="mt-[22px] font-heading text-[28px] font-normal text-eucalypt-600">
          Message sent — thank you
        </h2>
        <p className="mx-auto mt-2.5 max-w-[400px] text-base leading-[1.6] text-charcoal">
          We read every message ourselves. Expect a reply within a few days — sooner if the
          kettle&apos;s on.
        </p>
        <Button
          type="button"
          className="mt-6"
          onClick={() => {
            setStatus('idle');
            setSubmitError('');
            reset();
            formLoadTime.current = Date.now();
          }}
        >
          Send another →
        </Button>
      </div>
    );
  }

  return (
    <div>
      {status === 'error' && (
        <Alert variant="destructive" className="mb-6">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div>
              <p className="text-sm font-semibold">Unable to send message</p>
              <p className="mt-1 text-sm">
                {submitError ||
                  'Please try again or contact us directly at contact@carinyaparc.com.au'}
              </p>
            </div>
          </div>
        </Alert>
      )}

      <form
        onSubmit={(event) => {
          void handleSubmit(onSubmit)(event);
        }}
        noValidate
      >
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
          <FormField name="firstName" label="First name" error={errors.firstName?.message} required>
            <Input
              id="firstName"
              type="text"
              autoComplete="given-name"
              {...register('firstName')}
              onFocus={handleFormInteraction}
              disabled={isPending}
            />
          </FormField>

          <FormField name="lastName" label="Last name" error={errors.lastName?.message} required>
            <Input
              id="lastName"
              type="text"
              autoComplete="family-name"
              {...register('lastName')}
              disabled={isPending}
            />
          </FormField>

          <div className="sm:col-span-2">
            <FormField name="email" label="Email" error={errors.email?.message} required>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                {...register('email')}
                disabled={isPending}
                placeholder="jane@example.com"
              />
            </FormField>
          </div>

          <div className="sm:col-span-2">
            <FormField
              name="phone"
              label="Phone number"
              description="Optional"
              error={errors.phone?.message}
            >
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder="+61 4XX XXX XXX"
                {...register('phone')}
                disabled={isPending}
              />
            </FormField>
          </div>

          <div className="sm:col-span-2">
            <FormField
              name="inquiryType"
              label="I'm reaching out about"
              error={errors.inquiryType?.message}
              required
            >
              <Select id="inquiryType" {...register('inquiryType')} disabled={isPending}>
                <option value="">Select a topic</option>
                {INQUIRY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          <div className="sm:col-span-2">
            <FormField name="message" label="Message" error={errors.message?.message} required>
              <Textarea
                id="message"
                rows={5}
                {...register('message')}
                disabled={isPending}
                placeholder="Tell us what you have in mind..."
                maxLength={500}
              />
            </FormField>
          </div>

          <div className="sm:col-span-2" aria-hidden="true" style={{ display: 'none' }}>
            <label htmlFor="website" className="block text-sm/6 font-semibold text-charcoal">
              Website
            </label>
            <div className="mt-2.5">
              <input
                type="text"
                id="website"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                className="block w-full rounded-md bg-white px-3.5 py-2"
              />
            </div>
          </div>

          <div className="mt-6 sm:col-span-2">
            <Button
              type="submit"
              disabled={isPending || !isFormReady}
              isLoading={isPending}
              className="w-full justify-center"
            >
              {isPending ? 'Sending message…' : 'Send message →'}
            </Button>

            <p className="mt-3.5 text-center text-[13px] text-stone">
              We respect your privacy. We&apos;ll only use your details to reply. Read our{' '}
              <a
                href="/legal/privacy-policy/"
                className="font-semibold text-eucalypt-600 hover:opacity-70"
              >
                privacy policy
              </a>
              .
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
