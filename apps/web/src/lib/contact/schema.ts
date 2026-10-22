/**
 * Contact form Zod validation schema
 */

import { z } from 'zod';

import { isSpamEmail } from '@/lib/validation/spam-email';

export const inquiryTypes = ['general', 'tours', 'volunteer', 'partnership'] as const;

/** Letters in any language, plus spaces, hyphens, and straight or curly apostrophes. */
const PERSON_NAME = /^[\p{L}\s'’‘-]+$/u;

function isPersonName(value: string): boolean {
  return PERSON_NAME.test(value.normalize('NFC'));
}

/**
 * Accept an Australian number, including the spaced shape the field shows.
 * National numbers are a leading 0 plus nine digits. International numbers are
 * 61 plus those nine digits, with or without a leading +, and may keep the trunk 0.
 * Spaces, brackets, and other separators are ignored.
 */
function isAustralianPhone(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === '') {
    return true;
  }

  const digits = trimmed.replace(/\D/g, '');
  const international = trimmed.startsWith('+') || digits.startsWith('61');

  if (international && /^61\d{9}$/.test(digits)) {
    return true;
  }

  if (international && /^610\d{9}$/.test(digits)) {
    return true;
  }

  return /^0\d{9}$/.test(digits);
}

/**
 * Contact form Zod schema
 * Single source of truth for client and server validation
 */
export const contactFormSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be 50 characters or less')
    .refine(isPersonName, 'First name can only contain letters, spaces, hyphens, and apostrophes'),

  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be 50 characters or less')
    .refine(isPersonName, 'Last name can only contain letters, spaces, hyphens, and apostrophes'),

  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .refine((email) => !isSpamEmail(email), {
      message: 'This email address appears to be invalid',
    }),

  phone: z
    .string()
    .refine(isAustralianPhone, 'Use an Australian number, such as +61 412 345 678')
    .optional()
    .or(z.literal('')),

  inquiryType: z.enum(inquiryTypes),

  message: z
    .string()
    .trim()
    .min(1, 'Please write a short note')
    .max(500, 'Message must be 500 characters or less'),

  website: z.string().optional().or(z.literal('')),

  submissionTime: z.number().optional(),
});

export type ContactFormData = z.infer<typeof contactFormSchema>;

export type InquiryType = (typeof inquiryTypes)[number];

/** Read `?inquiry=` from a location search string. Unknown values are ignored. */
export function inquiryTypeFromSearch(search: string): InquiryType | undefined {
  const value = new URLSearchParams(search).get('inquiry');
  if (value && (inquiryTypes as readonly string[]).includes(value)) {
    return value as InquiryType;
  }
  return undefined;
}

export const contactFormClientSchema = contactFormSchema.omit({
  website: true,
  submissionTime: true,
});

export type ContactFormClientData = z.infer<typeof contactFormClientSchema>;
