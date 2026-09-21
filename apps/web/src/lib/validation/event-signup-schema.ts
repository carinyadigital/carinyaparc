import { z } from 'zod';

/**
 * Event signup Zod schema — shared by the public form and POST /api/events/signup.
 * Mirrors the contact/subscribe security fields (honeypot + submission timing).
 * Spam-email rejection is handled in the route (silent success), not here.
 */
export const eventSignupSchema = z.object({
  eventId: z.coerce.number().int().positive('Event is required'),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(120, 'Name must be 120 characters or less')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
  email: z
    .string()
    .min(1, 'Email is required')
    .max(254, 'Please enter a valid email address')
    .email('Please enter a valid email address'),
  website: z.string().optional(),
  submissionTime: z.number().optional(),
});

export type EventSignupData = z.infer<typeof eventSignupSchema>;

export const eventSignupClientSchema = eventSignupSchema.omit({
  website: true,
  submissionTime: true,
});

export type EventSignupClientData = z.infer<typeof eventSignupClientSchema>;
