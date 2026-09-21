/**
 * Pure mapping helpers for the Payload → JSON content export.
 *
 * Everything here is side-effect free so it can be unit tested without a
 * database. The export script (`scripts/export-payload.ts`) fetches documents
 * at `depth: 0` (relationships as numeric ids) and uses these helpers to
 * replace ids with slugs and to shape the records the Astro converter reads.
 */

import type {
  Author,
  Category,
  Event,
  EventRegistration,
  Post,
  Recipe,
  Tag,
} from '../../src/payload-types';

export type DocStatus = 'draft' | 'published';

export interface SlugLookup {
  authors: Map<number, string>;
  categories: Map<number, string>;
  tags: Map<number, string>;
  events: Map<number, string>;
}

export interface ExportedAuthor {
  id: number;
  slug: string;
  name: string;
  imageUrl: string | null;
  bio: string | null;
}

export interface ExportedCategory {
  id: number;
  slug: string;
  name: string;
  description: string | null;
}

export interface ExportedTag {
  id: number;
  slug: string;
  name: string;
}

export interface ExportedPost {
  id: number;
  slug: string;
  status: DocStatus;
  title: string;
  date: string;
  author: string | null;
  category: string | null;
  tags: string[];
  featured: boolean;
  excerpt: string;
  description: string | null;
  image: string | null;
  /** Lexical editor state, kept verbatim for fidelity checks. */
  body: Post['body'];
  /** Markdown produced by `convertLexicalToMarkdown`. */
  bodyMarkdown: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExportedRecipe {
  id: number;
  slug: string;
  status: DocStatus;
  title: string;
  date: string;
  author: string | null;
  difficulty: Recipe['difficulty'] | null;
  servings: number | null;
  prepTime: string | null;
  cookTime: string | null;
  totalTime: string | null;
  excerpt: string;
  description: string | null;
  image: string | null;
  tags: string[];
  ingredients: string[];
  instructions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ExportedEvent {
  id: number;
  slug: string;
  status: DocStatus;
  title: string;
  startsAt: string;
  location: string;
  capacity: number | null;
  isFull: boolean;
  signupTarget: string | null;
  description: Event['description'];
  descriptionMarkdown: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExportedEventRegistration {
  id: number;
  event: string | null;
  name: string;
  email: string;
  status: EventRegistration['status'];
  createdAt: string;
}

type RelationValue<T> = number | T | null | undefined;

/** Resolve a `depth: 0` relationship value (id) or a populated doc to its slug. */
export function relationToSlug<T extends { id: number; slug: string }>(
  value: RelationValue<T>,
  lookup: Map<number, string>,
): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number') {
    return lookup.get(value) ?? null;
  }
  return value.slug;
}

export function relationsToSlugs<T extends { id: number; slug: string }>(
  values: RelationValue<T>[] | null | undefined,
  lookup: Map<number, string>,
): string[] {
  if (!values) {
    return [];
  }
  return values
    .map((value) => relationToSlug(value, lookup))
    .filter((slug): slug is string => typeof slug === 'string');
}

export function normaliseStatus(status: string | null | undefined): DocStatus {
  return status === 'published' ? 'published' : 'draft';
}

function emptyToNull(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function buildSlugLookup(input: {
  authors: Pick<Author, 'id' | 'slug'>[];
  categories: Pick<Category, 'id' | 'slug'>[];
  tags: Pick<Tag, 'id' | 'slug'>[];
  events: Pick<Event, 'id' | 'slug'>[];
}): SlugLookup {
  const toMap = (docs: { id: number; slug: string }[]) =>
    new Map(docs.map((doc) => [doc.id, doc.slug] as const));
  return {
    authors: toMap(input.authors),
    categories: toMap(input.categories),
    tags: toMap(input.tags),
    events: toMap(input.events),
  };
}

export function mapAuthor(doc: Author): ExportedAuthor {
  return {
    id: doc.id,
    slug: doc.slug,
    name: doc.name,
    imageUrl: emptyToNull(doc.imageUrl),
    bio: emptyToNull(doc.bio),
  };
}

export function mapCategory(doc: Category): ExportedCategory {
  return {
    id: doc.id,
    slug: doc.slug,
    name: doc.name,
    description: emptyToNull(doc.description),
  };
}

export function mapTag(doc: Tag): ExportedTag {
  return { id: doc.id, slug: doc.slug, name: doc.name };
}

export function mapPost(doc: Post, lookup: SlugLookup, bodyMarkdown: string): ExportedPost {
  return {
    id: doc.id,
    slug: doc.slug,
    status: normaliseStatus(doc._status),
    title: doc.title,
    date: doc.date,
    author: relationToSlug(doc.author, lookup.authors),
    category: relationToSlug(doc.category, lookup.categories),
    tags: relationsToSlugs(doc.tags, lookup.tags),
    featured: doc.featured === true,
    excerpt: doc.excerpt,
    description: emptyToNull(doc.description),
    image: emptyToNull(doc.image),
    body: doc.body,
    bodyMarkdown,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function mapRecipe(doc: Recipe, lookup: SlugLookup): ExportedRecipe {
  return {
    id: doc.id,
    slug: doc.slug,
    status: normaliseStatus(doc._status),
    title: doc.title,
    date: doc.date,
    author: relationToSlug(doc.author, lookup.authors),
    difficulty: doc.difficulty ?? null,
    servings: typeof doc.servings === 'number' ? doc.servings : null,
    prepTime: emptyToNull(doc.prepTime),
    cookTime: emptyToNull(doc.cookTime),
    totalTime: emptyToNull(doc.totalTime),
    excerpt: doc.excerpt,
    description: emptyToNull(doc.description),
    image: emptyToNull(doc.image),
    tags: relationsToSlugs(doc.tags, lookup.tags),
    ingredients: (doc.ingredients ?? []).map((row) => row.item),
    instructions: (doc.instructions ?? []).map((row) => row.step),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function mapEvent(doc: Event, descriptionMarkdown: string): ExportedEvent {
  return {
    id: doc.id,
    slug: doc.slug,
    status: normaliseStatus(doc._status),
    title: doc.title,
    startsAt: doc.startsAt,
    location: doc.location,
    capacity: typeof doc.capacity === 'number' ? doc.capacity : null,
    isFull: doc.isFull === true,
    signupTarget: emptyToNull(doc.signupTarget),
    description: doc.description,
    descriptionMarkdown,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function mapEventRegistration(
  doc: EventRegistration,
  lookup: SlugLookup,
): ExportedEventRegistration {
  return {
    id: doc.id,
    event: relationToSlug(doc.event, lookup.events),
    name: doc.name,
    email: doc.email,
    status: doc.status,
    createdAt: doc.createdAt,
  };
}

/** Sort helper so export files are stable across runs (diff-friendly). */
export function bySlug<T extends { slug: string }>(a: T, b: T): number {
  return a.slug.localeCompare(b.slug);
}
