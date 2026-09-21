import { z } from 'zod';

/** Canonical interest values for in-flow subscribe and welcome routing. */
export const SUBSCRIBE_INTERESTS = [
  'restoration',
  'regenerative-farming',
  'community',
  'produce',
  'learning',
] as const;

export type SubscribeInterest = (typeof SUBSCRIBE_INTERESTS)[number];

/**
 * Display labels for the five interests — same copy as the standalone `/subscribe/` page.
 * Values are the canonical enum used by in-flow modules and MailerLite.
 */
export const SUBSCRIBE_INTEREST_OPTIONS: ReadonlyArray<{
  value: SubscribeInterest;
  label: string;
}> = [
  { value: 'restoration', label: 'Ecological restoration' },
  { value: 'regenerative-farming', label: 'Regenerative farming' },
  { value: 'community', label: 'Community involvement' },
  { value: 'produce', label: 'Future produce' },
  { value: 'learning', label: 'Learning opportunities' },
];

/**
 * Legacy option values from the standalone `/subscribe/` form → canonical interest.
 * Keep accepting `interests` so the live page does not break.
 */
export const LEGACY_INTEREST_MAP: Record<string, SubscribeInterest> = {
  regeneration: 'restoration',
  farming: 'regenerative-farming',
  community: 'community',
  produce: 'produce',
  learning: 'learning',
  restoration: 'restoration',
  'regenerative-farming': 'regenerative-farming',
};

/**
 * Prefer the new `interest` enum; fall back to mapping legacy `interests`.
 */
export function resolveSubscribeInterest(
  interest?: SubscribeInterest,
  interests?: string,
): SubscribeInterest | undefined {
  if (interest) {
    return interest;
  }

  if (!interests || interests.trim() === '') {
    return undefined;
  }

  return LEGACY_INTEREST_MAP[interests.trim()];
}

/** Attribution source for blog in-flow modules, e.g. `blog:winter-fencing-progress`. */
export function blogSubscribeSource(slug: string): string {
  return `blog:${slug}`;
}

/**
 * Client-side email check before calling `/api/subscribe`.
 * Returns an error message when invalid; `undefined` when the email is OK.
 */
export function getSubscribeEmailError(email: string): string | undefined {
  const result = subscribeFormSchema.pick({ email: true }).safeParse({ email });
  if (result.success) {
    return undefined;
  }

  return result.error.issues[0]?.message ?? 'Please provide a valid email address';
}

export const subscribeFormSchema = z.object({
  email: z
    .string()
    .min(1, 'Please provide a valid email address')
    .max(254, 'Please provide a valid email address')
    .email('Please provide a valid email address'),
  name: z
    .string()
    .max(50, 'Please provide a valid name (letters, spaces, hyphens, and apostrophes only)')
    .regex(
      /^[a-zA-Z\s'-]*$/,
      'Please provide a valid name (letters, spaces, hyphens, and apostrophes only)',
    )
    .optional(),
  interest: z.enum(SUBSCRIBE_INTERESTS).optional(),
  interests: z.string().optional(),
  source: z.string().max(200).optional(),
  website: z.string().optional(),
  submissionTime: z.number().optional(),
});

export type SubscribeFormData = z.infer<typeof subscribeFormSchema>;
