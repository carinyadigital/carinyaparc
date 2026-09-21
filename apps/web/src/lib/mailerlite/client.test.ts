import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildMailerLiteSubscriberPayload,
  eventGroupName,
  resetMailerLiteGroupCache,
  resolveEventGroupId,
  upsertMailerLiteSubscriber,
} from './client';

describe('buildMailerLiteSubscriberPayload', () => {
  it('persists canonical interest and source as MailerLite fields', () => {
    expect(
      buildMailerLiteSubscriberPayload({
        email: 'reader@carinyaparc.com.au',
        interest: 'restoration',
        source: 'blog:soil-notes',
      }),
    ).toEqual({
      email: 'reader@carinyaparc.com.au',
      fields: {
        interest: 'restoration',
        interests: 'restoration',
        source: 'blog:soil-notes',
      },
    });
  });

  it('maps legacy interests into interest + interests fields', () => {
    expect(
      buildMailerLiteSubscriberPayload({
        email: 'reader@carinyaparc.com.au',
        name: 'Alex',
        interests: 'farming',
      }),
    ).toEqual({
      email: 'reader@carinyaparc.com.au',
      fields: {
        name: 'Alex',
        interest: 'regenerative-farming',
        interests: 'regenerative-farming',
      },
    });
  });

  it('forwards unknown legacy interests without inventing a canonical interest', () => {
    expect(
      buildMailerLiteSubscriberPayload({
        email: 'reader@carinyaparc.com.au',
        interests: 'something-custom',
      }),
    ).toEqual({
      email: 'reader@carinyaparc.com.au',
      fields: {
        interests: 'something-custom',
      },
    });
  });

  it('includes group ids when provided', () => {
    expect(
      buildMailerLiteSubscriberPayload({
        email: 'reader@carinyaparc.com.au',
        groups: ['grp_1'],
      }),
    ).toEqual({
      email: 'reader@carinyaparc.com.au',
      groups: ['grp_1'],
    });
  });
});

describe('upsertMailerLiteSubscriber', () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.MAILERLITE_API_KEY;

  beforeEach(() => {
    process.env.MAILERLITE_API_KEY = 'test-key';
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { id: '1' } }),
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalApiKey === undefined) {
      delete process.env.MAILERLITE_API_KEY;
    } else {
      process.env.MAILERLITE_API_KEY = originalApiKey;
    }
  });

  it('returns a configuration error when the API key is missing', async () => {
    delete process.env.MAILERLITE_API_KEY;
    const result = await upsertMailerLiteSubscriber({ email: 'a@carinyaparc.com.au' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(500);
      expect(result.error).toMatch(/MAILERLITE_API_KEY/);
    }
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('posts the subscriber payload to MailerLite', async () => {
    const result = await upsertMailerLiteSubscriber({
      email: 'a@carinyaparc.com.au',
      fields: { source: 'blog:test' },
    });
    expect(result).toEqual({ ok: true, status: 200 });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(global.fetch).mock.calls[0]!;
    expect(String(url)).toBe('https://connect.mailerlite.com/api/subscribers');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({
      email: 'a@carinyaparc.com.au',
      fields: { source: 'blog:test' },
    });
  });
});

describe('resolveEventGroupId', () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.MAILERLITE_API_KEY;

  beforeEach(() => {
    process.env.MAILERLITE_API_KEY = 'test-key';
    resetMailerLiteGroupCache();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    resetMailerLiteGroupCache();
    if (originalApiKey === undefined) {
      delete process.env.MAILERLITE_API_KEY;
    } else {
      process.env.MAILERLITE_API_KEY = originalApiKey;
    }
  });

  it('names groups after the event slug', () => {
    expect(eventGroupName('winter-planting-day')).toBe('event:winter-planting-day');
  });

  it('reuses an existing group with a matching name', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [{ id: 9, name: 'event:open-day' }] }),
    }) as unknown as typeof fetch;

    const result = await resolveEventGroupId('open-day');
    expect(result.ok).toBe(true);
    expect(result.groupId).toBe('9');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('creates a group when none exists and caches the id', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ data: { id: 'grp_new' } }),
      }) as unknown as typeof fetch;

    const created = await resolveEventGroupId('open-day');
    expect(created).toMatchObject({ ok: true, groupId: 'grp_new' });

    const cached = await resolveEventGroupId('open-day');
    expect(cached.groupId).toBe('grp_new');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
