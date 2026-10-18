import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ContactFormData } from '@/lib/contact/schema';

import { postContact } from './client';

const payload: ContactFormData = {
  firstName: 'Jane',
  lastName: 'Citizen',
  email: 'reader@carinyaparc.com.au',
  phone: '',
  inquiryType: 'volunteer',
  message: 'I would like to volunteer for a planting day on the farm.',
  website: '',
  submissionTime: 5_000,
};

describe('postContact', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps the HTTP status when the contact API rejects the message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({
          error:
            'Rate limit exceeded. This email address has already submitted an inquiry recently. Please try again in 24 hours.',
        }),
      }),
    );

    await expect(postContact(payload)).rejects.toMatchObject({
      status: 429,
    });
  });
});
