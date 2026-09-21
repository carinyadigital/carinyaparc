import { useState } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

import { SubscribePrivacyNote } from '@/components/subscribe/SubscribePrivacyNote';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { postSubscribe } from '@/lib/subscribe/client';
import {
  LEGACY_INTEREST_MAP,
  SUBSCRIBE_INTEREST_OPTIONS,
  type SubscribeInterest,
} from '@/lib/validation/subscribe-schema';

export type SubscribeFormData = {
  email: string;
  name: string;
  interests: string;
  website?: string;
};

interface SubscribeFormProps {
  showName?: boolean;
  showInterests?: boolean;
  source?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function SubscribeForm({
  showName = true,
  showInterests = true,
  source,
  onSuccess,
  onError,
}: SubscribeFormProps) {
  const [formData, setFormData] = useState<SubscribeFormData>({
    email: '',
    name: '',
    interests: '',
    website: '',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [formLoadTime] = useState<number>(() => Date.now());

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
      interest: mappedInterest as SubscribeInterest | undefined,
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
            <SubscribePrivacyNote className="mt-4 text-center" />
          </div>
        </form>
      </div>
    </div>
  );
}
