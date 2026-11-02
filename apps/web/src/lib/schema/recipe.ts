import { BASE_URL } from '../constants';

export interface RecipeSchema {
  '@context': string;
  '@type': string;
  name: string;
  description: string;
  author: {
    '@type': string;
    name: string;
  };
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  recipeYield?: string;
  recipeIngredient?: string[];
  recipeInstructions?: string;
  image?: string;
  datePublished?: string;
}

export function generateRecipeSchema(data: {
  name: string;
  description: string;
  author: string;
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  recipeYield?: string;
  recipeIngredient?: string[];
  recipeInstructions?: string;
  image?: string;
  datePublished?: string;
}): RecipeSchema | undefined {
  // A recipe result requires a photograph of the dish. Without one, crawlers
  // report the type as an error, so the page keeps its other structured data
  // and omits Recipe until a real image is set.
  if (!data.image) return undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: data.name,
    description: data.description,
    author: { '@type': 'Person', name: data.author },
    ...(data.prepTime && { prepTime: data.prepTime }),
    ...(data.cookTime && { cookTime: data.cookTime }),
    ...(data.totalTime && { totalTime: data.totalTime }),
    ...(data.recipeYield && { recipeYield: data.recipeYield }),
    ...(data.recipeIngredient && { recipeIngredient: data.recipeIngredient }),
    ...(data.recipeInstructions && { recipeInstructions: data.recipeInstructions }),
    image: data.image.startsWith('http') ? data.image : `${BASE_URL}${data.image}`,
    ...(data.datePublished && { datePublished: data.datePublished }),
  };
}

export type RecipeData = Parameters<typeof generateRecipeSchema>[0];
