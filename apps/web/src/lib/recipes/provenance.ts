/** How a recipe page says which ingredients come from the property. */

export interface RecipeIngredient {
  item: string;
  fromFarm?: boolean;
}

export const FROM_THE_PROPERTY_LABEL = 'From the property';

/**
 * One sentence above the ingredient list.
 * A marked line is food the journal already says comes from the property.
 */
export function farmIngredientNote(ingredients: readonly RecipeIngredient[]): string {
  const anyFromFarm = ingredients.some((ingredient) => ingredient.fromFarm);
  return anyFromFarm
    ? 'Marked lines come from the property. The rest are bought.'
    : 'None of these ingredients come from the property yet.';
}
