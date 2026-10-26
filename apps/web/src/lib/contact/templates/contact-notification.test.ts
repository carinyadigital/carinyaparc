import { describe, expect, it } from 'vitest';

import { generateContactNotificationEmail } from './contact-notification';

const inquiry = {
  firstName: 'Alex',
  lastName: 'Farmer',
  email: 'alex@fastmail.com',
  inquiryType: 'general',
  message: 'I would like to visit the farm next month.',
  submittedAt: new Date('2026-10-22T01:00:00.000Z'),
};

describe('generateContactNotificationEmail', () => {
  it('escapes request headers before writing them into the HTML body', () => {
    const html = generateContactNotificationEmail({
      ...inquiry,
      sourceIP: '"><a href="https://evil.example/phish">',
      userAgent: '<img src=x onerror="alert(1)">',
    });

    expect(html).not.toContain('<img');
    expect(html).not.toContain('<a href="https://evil.example/phish"');
    expect(html).toContain('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
    expect(html).toContain('&quot;&gt;&lt;a href=&quot;https://evil.example/phish&quot;&gt;');
    expect(html).toContain('Alex');
    expect(html).toContain('I would like to visit the farm next month.');
  });

  it('keeps an ordinary user agent readable', () => {
    const html = generateContactNotificationEmail({
      ...inquiry,
      sourceIP: '203.0.113.8',
      userAgent: 'Mozilla/5.0',
    });

    expect(html).toContain('IP Address: 203.0.113.8');
    expect(html).toContain('User Agent: Mozilla/5.0');
  });
});
