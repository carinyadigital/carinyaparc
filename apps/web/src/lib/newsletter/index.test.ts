import { beforeEach, describe, expect, it, vi } from 'vitest';

const { subscribeWithMailerLite, addToMailerLiteList } = vi.hoisted(() => ({
  subscribeWithMailerLite: vi.fn(),
  addToMailerLiteList: vi.fn(),
}));

vi.mock('@/lib/newsletter/mailerlite', () => ({
  subscribeWithMailerLite,
  addToMailerLiteList,
}));

import { addToList, subscribe } from './index';

describe('newsletter server API', () => {
  beforeEach(() => {
    subscribeWithMailerLite.mockReset();
    addToMailerLiteList.mockReset();
  });

  it('delegates subscribe to the provider adapter', async () => {
    subscribeWithMailerLite.mockResolvedValue({ ok: true, status: 200 });

    await expect(subscribe({ email: 'a@carinyaparc.com.au' })).resolves.toEqual({
      ok: true,
      status: 200,
    });
    expect(subscribeWithMailerLite).toHaveBeenCalledWith({ email: 'a@carinyaparc.com.au' });
  });

  it('delegates addToList to the provider adapter', async () => {
    addToMailerLiteList.mockResolvedValue({ ok: true, status: 201 });

    await addToList({ email: 'a@carinyaparc.com.au', list: 'open-day' });

    expect(addToMailerLiteList).toHaveBeenCalledWith({
      email: 'a@carinyaparc.com.au',
      list: 'open-day',
    });
  });
});
