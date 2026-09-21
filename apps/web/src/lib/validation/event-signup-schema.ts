import { z } from 'zod';

import { SLUG_PATTERN } from '@/lib/content/schema';

/**
 * Event signup Zod schema — shared by the public form and POST /api/events/signup.
 * Events are identified by content slug (there is no numeric CMS id).
 * Spam-email rejection is handled in the route (silent success), not here.
 */
export const eventSignupSchema = z.object({
  eventSlug: z.string().min(1, 'Event is required').regex(SLUG_PATTERN, 'Event is required'),
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
