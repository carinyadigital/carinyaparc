import { describe, expect, it } from 'vitest';

import { BASE_URL } from '../constants';
import { generateRecipeSchema } from './recipe';

const dish = {
  name: 'Winter root vegetable stew',
  description: 'A midwinter stew of roots and pantry staples from the Carinya Parc kitchen.',
  author: 'Jonno',
  prepTime: 'PT20M',
  recipeYield: '4',
  recipeIngredient: ['2 tbsp olive oil'],
  recipeInstructions: 'Simmer until the vegetables are tender.',
};

describe('generateRecipeSchema', () => {
  it('omits the type when the dish has no photograph', () => {
    expect(generateRecipeSchema(dish)).toBeUndefined();
  });

  it('publishes an absolute photograph with the recipe', () => {
    const schema = generateRecipeSchema({ ...dish, image: '/images/stew.jpg' });

    expect(schema).toMatchObject({
      '@type': 'Recipe',
      name: dish.name,
      image: `${BASE_URL}/images/stew.jpg`,
      prepTime: 'PT20M',
      recipeYield: '4',
    });
  });

  it('keeps an absolute photograph as given', () => {
    const image = 'https://carinyaparc.com.au/images/stew.jpg';
    expect(generateRecipeSchema({ ...dish, image })?.image).toBe(image);
  });
});
