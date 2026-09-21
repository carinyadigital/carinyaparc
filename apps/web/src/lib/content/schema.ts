/**
 * Shared content-field patterns used by the Astro collection schemas.
 * Keep these as regexes so they can be unit-tested without loading `astro:content`.
 */

/** ISO 8601 duration limited to hours, minutes, and seconds (e.g. PT20M, PT2H30M). */
export const ISO_8601_DURATION = /^PT(?=\d)(?:\d+H)?(?:\d+M)?(?:\d+S)?$/;

/** URL-safe kebab-case slug, matching existing public routes. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const RECIPE_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

export type RecipeDifficulty = (typeof RECIPE_DIFFICULTIES)[number];
