import { describe, expect, it } from 'vitest';

import { isSpamEmail } from './spam-email';

describe('isSpamEmail', () => {
  it('rejects placeholder local-parts and whole placeholder domains', () => {
    expect(isSpamEmail('test@test.com')).toBe(true);
    expect(isSpamEmail('example@example.com')).toBe(true);
    expect(isSpamEmail('reader@example.com')).toBe(true);
    expect(isSpamEmail('bot@test.com')).toBe(true);
    expect(isSpamEmail('bot@temp.com')).toBe(true);
    expect(isSpamEmail('bot@fake.com')).toBe(true);
    expect(isSpamEmail('bot@invalid.com')).toBe(true);
    expect(isSpamEmail('bot@localhost')).toBe(true);
  });

  it('keeps ordinary addresses that the old patterns treated as spam', () => {
    expect(isSpamEmail('regenerativeagriculture@gmail.com')).toBe(false);
    expect(isSpamEmail('christophermacdonald@gmail.com')).toBe(false);
    expect(isSpamEmail('0412345678@gmail.com')).toBe(false);
    expect(isSpamEmail('latest@testing.com')).toBe(false);
    expect(isSpamEmail('myexample@gmail.com')).toBe(false);
    expect(isSpamEmail('farmer@testament.com')).toBe(false);
    expect(isSpamEmail('farmer@template.com')).toBe(false);
    expect(isSpamEmail('reader@carinyaparc.com.au')).toBe(false);
  });
});
