import { describe, expect, it } from 'vitest';

import type { Event, EventRegistration, Post, Recipe } from '../../src/payload-types';

import {
  buildSlugLookup,
  bySlug,
  mapEvent,
  mapEventRegistration,
  mapPost,
  mapRecipe,
  normaliseStatus,
  relationToSlug,
  relationsToSlugs,
} from './export-mappers';

const emptyRichText = {
  root: {
    type: 'root',
    children: [],
    direction: null,
    format: '' as const,
    indent: 0,
    version: 1,
  },
};

const lookup = buildSlugLookup({
  authors: [{ id: 1, slug: 'jonno' }],
  categories: [{ id: 10, slug: 'field-reports' }],
  tags: [
    { id: 100, slug: 'pasture' },
    { id: 101, slug: 'winter' },
  ],
  events: [{ id: 7, slug: 'spring-planting-day' }],
});

describe('relationship resolution', () => {
  it('resolves numeric ids through the lookup', () => {
    expect(relationToSlug(1, lookup.authors)).toBe('jonno');
    expect(relationsToSlugs([100, 101], lookup.tags)).toEqual(['pasture', 'winter']);
  });

  it('accepts populated documents', () => {
    expect(relationToSlug({ id: 1, slug: 'jonno' }, lookup.authors)).toBe('jonno');
  });

  it('drops unknown ids instead of throwing', () => {
    expect(relationToSlug(999, lookup.authors)).toBeNull();
    expect(relationsToSlugs([100, 999], lookup.tags)).toEqual(['pasture']);
    expect(relationsToSlugs(null, lookup.tags)).toEqual([]);
  });
});

describe('normaliseStatus', () => {
  it('treats anything other than published as draft', () => {
    expect(normaliseStatus('published')).toBe('published');
    expect(normaliseStatus('draft')).toBe('draft');
    expect(normaliseStatus(null)).toBe('draft');
    expect(normaliseStatus(undefined)).toBe('draft');
  });
});

describe('mapPost', () => {
  const post: Post = {
    id: 5,
    title: 'Midwinter Pasture',
    slug: 'midwinter-pasture-recovery',
    date: '2026-07-14T00:00:00.000Z',
    author: 1,
    category: 10,
    featured: null,
    excerpt: 'Excerpt.',
    description: '   ',
    image: '/images/highland-cattle-dam.jpg',
    tags: [100, 101],
    body: emptyRichText,
    updatedAt: '2026-07-15T00:00:00.000Z',
    createdAt: '2026-07-14T00:00:00.000Z',
    _status: 'published',
  };

  it('maps relationships to slugs and normalises optional fields', () => {
    const mapped = mapPost(post, lookup, '## Heading\n\nBody.');

    expect(mapped).toMatchObject({
      slug: 'midwinter-pasture-recovery',
      status: 'published',
      author: 'jonno',
      category: 'field-reports',
      tags: ['pasture', 'winter'],
      featured: false,
      description: null,
      image: '/images/highland-cattle-dam.jpg',
      bodyMarkdown: '## Heading\n\nBody.',
    });
    expect(mapped.body).toBe(post.body);
  });
});

describe('mapRecipe', () => {
  const recipe: Recipe = {
    id: 3,
    title: 'Winter Root Vegetable Stew',
    slug: 'winter-root-vegetable-stew',
    date: '2026-07-20T00:00:00.000Z',
    author: 1,
    difficulty: 'easy',
    servings: 4,
    prepTime: 'PT20M',
    cookTime: '',
    totalTime: null,
    excerpt: 'Excerpt.',
    image: null,
    tags: null,
    ingredients: [{ item: '500 g root vegetables', id: 'a' }],
    instructions: [{ step: 'Chop.', id: 'b' }, { step: 'Simmer.' }],
    updatedAt: '2026-07-20T00:00:00.000Z',
    createdAt: '2026-07-20T00:00:00.000Z',
    _status: 'draft',
  };

  it('flattens ingredient and instruction rows to strings', () => {
    const mapped = mapRecipe(recipe, lookup);

    expect(mapped.ingredients).toEqual(['500 g root vegetables']);
    expect(mapped.instructions).toEqual(['Chop.', 'Simmer.']);
    expect(mapped.cookTime).toBeNull();
    expect(mapped.totalTime).toBeNull();
    expect(mapped.tags).toEqual([]);
    expect(mapped.status).toBe('draft');
  });
});

describe('mapEvent and mapEventRegistration', () => {
  const event: Event = {
    id: 7,
    title: 'Spring Planting Day',
    slug: 'spring-planting-day',
    startsAt: '2026-09-27T09:00:00.000Z',
    location: 'Carinya Parc, The Branch',
    capacity: 20,
    isFull: null,
    signupTarget: '',
    description: emptyRichText,
    updatedAt: '2026-08-01T00:00:00.000Z',
    createdAt: '2026-08-01T00:00:00.000Z',
    _status: 'published',
  };

  it('maps events with markdown description', () => {
    const mapped = mapEvent(event, 'Bring gloves.');
    expect(mapped).toMatchObject({
      slug: 'spring-planting-day',
      capacity: 20,
      isFull: false,
      signupTarget: null,
      descriptionMarkdown: 'Bring gloves.',
    });
  });

  it('resolves the registration event to a slug', () => {
    const registration: EventRegistration = {
      id: 1,
      event: 7,
      name: 'Sam',
      email: 'sam@example.com',
      status: 'registered',
      updatedAt: '2026-08-02T00:00:00.000Z',
      createdAt: '2026-08-02T00:00:00.000Z',
    };
    expect(mapEventRegistration(registration, lookup).event).toBe('spring-planting-day');
  });
});

describe('bySlug', () => {
  it('orders records alphabetically by slug', () => {
    const sorted = [{ slug: 'b' }, { slug: 'a' }].sort(bySlug);
    expect(sorted.map((r) => r.slug)).toEqual(['a', 'b']);
  });
});
