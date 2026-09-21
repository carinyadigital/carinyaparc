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
}): RecipeSchema {
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
    ...(data.image && {
      image: data.image.startsWith('http') ? data.image : `${BASE_URL}${data.image}`,
    }),
    ...(data.datePublished && { datePublished: data.datePublished }),
  };
}

export type RecipeData = Parameters<typeof generateRecipeSchema>[0];
