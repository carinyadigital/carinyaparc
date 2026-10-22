import { describe, expect, it } from 'vitest';

import { farmIngredientNote, FROM_THE_PROPERTY_LABEL } from './provenance';

describe('farmIngredientNote', () => {
  it('says when nothing comes from the property', () => {
    expect(
      farmIngredientNote([{ item: '4 eggs', fromFarm: false }, { item: '1 cup native greens' }]),
    ).toBe('None of these ingredients come from the property yet.');
  });

  it('points at the marked lines when some do', () => {
    expect(
      farmIngredientNote([
        { item: '4 sprigs rosemary', fromFarm: true },
        { item: '2 tbsp olive oil', fromFarm: false },
      ]),
    ).toBe('Marked lines come from the property. The rest are bought.');
  });

  it('uses a visible label, not colour alone', () => {
    expect(FROM_THE_PROPERTY_LABEL).toBe('From the property');
  });
});
