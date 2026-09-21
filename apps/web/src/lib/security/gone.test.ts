import { describe, expect, it } from 'vitest';

import { GONE_BODY, GONE_STATUS, goneResponse } from './gone';

describe('goneResponse', () => {
  it('returns HTTP 410 with a plain-text body', async () => {
    const response = goneResponse();

    expect(response.status).toBe(GONE_STATUS);
    expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
    await expect(response.text()).resolves.toBe(GONE_BODY);
  });
});
