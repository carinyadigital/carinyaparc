import { describe, expect, it } from 'vitest';

import { contactFormSchema, inquiryTypeFromSearch } from './schema';

describe('inquiryTypeFromSearch', () => {
  it('reads a known inquiry from the contact query', () => {
    expect(inquiryTypeFromSearch('?inquiry=tours')).toBe('tours');
    expect(inquiryTypeFromSearch('?inquiry=volunteer')).toBe('volunteer');
  });

  it('ignores a missing or unknown inquiry', () => {
    expect(inquiryTypeFromSearch('')).toBeUndefined();
    expect(inquiryTypeFromSearch('?inquiry=stay')).toBeUndefined();
    expect(inquiryTypeFromSearch('?inquiry=TOURS')).toBeUndefined();
  });
});

const enquiry = {
  firstName: 'Jane',
  lastName: 'Citizen',
  email: 'jane@fastmail.com',
  phone: '',
  inquiryType: 'tours' as const,
  message: 'Saturday morning tour?',
  website: '',
  submissionTime: 5000,
};

describe('contactFormSchema', () => {
  it('accepts the phone shape shown in the field', () => {
    const parsed = contactFormSchema.safeParse({ ...enquiry, phone: '+61 412 345 678' });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.phone).toBe('+61 412 345 678');
    }
  });

  it.each(['0412 345 678', '(02) 4912 3456', '+61 (0) 412 345 678', '61412345678', ''])(
    'accepts Australian phone %j',
    (phone) => {
      expect(contactFormSchema.safeParse({ ...enquiry, phone }).success).toBe(true);
    },
  );

  it.each(['+1 412 345 6789', '+61 4XX XXX XXX', '12345', '0412 345'])(
    'rejects phone %j',
    (phone) => {
      const parsed = contactFormSchema.safeParse({ ...enquiry, phone });

      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0]?.message).toBe(
          'Use an Australian number, such as +61 412 345 678',
        );
      }
    },
  );

  it('accepts names that are not plain English letters', () => {
    const parsed = contactFormSchema.safeParse({
      ...enquiry,
      firstName: 'Jose\u0301',
      lastName: 'O’Brien-Nguyễn',
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.firstName).toBe('Jose\u0301');
    }
  });

  it.each(['Jane3', 'Jane<script>', 'Mary@'])('rejects name %j', (firstName) => {
    expect(contactFormSchema.safeParse({ ...enquiry, firstName }).success).toBe(false);
  });

  it('accepts a short note and still refuses an empty message', () => {
    expect(contactFormSchema.safeParse(enquiry).success).toBe(true);
    expect(contactFormSchema.safeParse({ ...enquiry, message: '   ' }).success).toBe(false);
    expect(contactFormSchema.safeParse({ ...enquiry, message: `${'a'.repeat(501)}` }).success).toBe(
      false,
    );

    const trimmed = contactFormSchema.safeParse({ ...enquiry, message: '  Saturday tour  ' });
    expect(trimmed.success).toBe(true);
    if (trimmed.success) {
      expect(trimmed.data.message).toBe('Saturday tour');
    }
  });
});
