import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { API_SUBSCRIBE_PATH } from '@/lib/urls';

import { postSubscribe } from './client';

describe('postSubscribe', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns ok on a 200 response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    await expect(
      postSubscribe({ email: 'reader@carinyaparc.com.au', submissionTime: 5000 }),
    ).resolves.toEqual({ ok: true });

    expect(fetch).toHaveBeenCalledWith(
      API_SUBSCRIBE_PATH,
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('returns the API error message on failure', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'This email address has already been submitted recently.' }),
    } as Response);

    await expect(postSubscribe({ email: 'reader@carinyaparc.com.au' })).resolves.toEqual({
      ok: false,
      error: 'This email address has already been submitted recently.',
    });
  });

  it('returns a network error when fetch throws', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('offline'));

    await expect(postSubscribe({ email: 'reader@carinyaparc.com.au' })).resolves.toEqual({
      ok: false,
      error: 'Network error. Please check your connection and try again.',
    });
  });
});
