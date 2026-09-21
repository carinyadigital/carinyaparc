/** Read-side helpers over the `recipes` collection. */
import { getCollection, getEntry, type CollectionEntry } from 'astro:content';

import { formatContentDate } from './dates';
import { isPublished, tagName } from './posts';
import { recipeUrl } from '../urls';

export type RecipeEntry = CollectionEntry<'recipes'>;

export interface RecipeSummary {
  id: string;
  slug: string;
  title: string;
  date: Date;
  formattedDate: string;
  excerpt: string;
  description: string;
  difficulty: RecipeEntry['data']['difficulty'];
  servings?: number;
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  tags: { slug: string; name: string }[];
  image: RecipeEntry['data']['image'];
  imageAlt: string;
  href: string;
  authorName: string;
}

export async function getPublishedRecipes(): Promise<RecipeEntry[]> {
  const recipes = await getCollection('recipes', isPublished);
  return recipes.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export async function toRecipeSummary(entry: RecipeEntry): Promise<RecipeSummary> {
  const author = await getEntry(entry.data.author);
  return {
    id: entry.id,
    slug: entry.id,
    title: entry.data.title,
    date: entry.data.date,
    formattedDate: formatContentDate(entry.data.date),
    excerpt: entry.data.excerpt,
    description: entry.data.description ?? entry.data.excerpt,
    difficulty: entry.data.difficulty,
    servings: entry.data.servings,
    prepTime: entry.data.prepTime,
    cookTime: entry.data.cookTime,
    totalTime: entry.data.totalTime,
    tags: entry.data.tags.map((slug) => ({ slug, name: tagName(slug) })),
    image: entry.data.image,
    imageAlt: entry.data.imageAlt ?? entry.data.title,
    href: recipeUrl(entry.id),
    authorName: author?.data.name ?? 'Carinya Parc',
  };
}

export async function toRecipeSummaries(entries: RecipeEntry[]): Promise<RecipeSummary[]> {
  return Promise.all(entries.map(toRecipeSummary));
}
