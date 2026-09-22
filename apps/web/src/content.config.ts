import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

import { ISO_8601_DURATION, RECIPE_DIFFICULTIES } from './lib/content/schema';

/**
 * Content lives at the repository root (`/content`), outside `apps/`, so writers and content
 * agents never touch application code. Paths are relative to this app's root.
 */
const CONTENT_ROOT = '../../content';

const isoDuration = z
  .string()
  .regex(ISO_8601_DURATION, 'Must be an ISO 8601 duration such as PT20M');

const authors = defineCollection({
  loader: glob({ base: `${CONTENT_ROOT}/authors`, pattern: '**/*.{yaml,yml}' }),
  schema: ({ image }) =>
    z.object({
      name: z.string().min(1),
      image: image().optional(),
      bio: z.string().optional(),
    }),
});

const categories = defineCollection({
  loader: glob({ base: `${CONTENT_ROOT}/categories`, pattern: '**/*.{yaml,yml}' }),
  schema: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
  }),
});

const posts = defineCollection({
  loader: glob({ base: `${CONTENT_ROOT}/posts`, pattern: '**/*.mdx' }),
  schema: ({ image }) =>
    z.object({
      title: z.string().max(200),
      date: z.coerce.date(),
      author: reference('authors'),
      category: reference('categories').optional(),
      tags: z.array(z.string()).default([]),
      featured: z.boolean().default(false),
      excerpt: z.string().max(500),
      description: z.string().max(300).optional(),
      image: image().optional(),
      imageAlt: z.string().optional(),
      draft: z.boolean().default(false),
    }),
});

const recipes = defineCollection({
  loader: glob({ base: `${CONTENT_ROOT}/recipes`, pattern: '**/*.mdx' }),
  schema: ({ image }) =>
    z.object({
      title: z.string().max(200),
      date: z.coerce.date(),
      author: reference('authors'),
      difficulty: z.enum(RECIPE_DIFFICULTIES).optional(),
      servings: z.number().int().min(1).optional(),
      prepTime: isoDuration.optional(),
      cookTime: isoDuration.optional(),
      totalTime: isoDuration.optional(),
      excerpt: z.string().max(500),
      description: z.string().max(300).optional(),
      image: image().optional(),
      imageAlt: z.string().optional(),
      tags: z.array(z.string()).default([]),
      ingredients: z.array(z.object({ item: z.string().min(1) })).min(1),
      instructions: z.array(z.object({ step: z.string().min(1) })).min(1),
      draft: z.boolean().default(false),
    }),
});

const events = defineCollection({
  loader: glob({ base: `${CONTENT_ROOT}/events`, pattern: '**/*.mdx' }),
  schema: z.object({
    title: z.string().max(200),
    startsAt: z.coerce.date(),
    location: z.string().max(200),
    isFull: z.boolean().default(false),
    signupTarget: z
      .string()
      .url()
      .refine((value) => {
        try {
          const parsed = new URL(value);
          return parsed.protocol === 'https:' || parsed.protocol === 'http:';
        } catch {
          return false;
        }
      }, 'Signup target must be a valid http:// or https:// URL.')
      .optional(),
    draft: z.boolean().default(false),
  }),
});

const legal = defineCollection({
  loader: glob({ base: `${CONTENT_ROOT}/legal`, pattern: '**/*.mdx' }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
  }),
});

export const collections = {
  posts,
  recipes,
  events,
  authors,
  categories,
  legal,
};
