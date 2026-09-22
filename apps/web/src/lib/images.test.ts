import { describe, expect, it } from 'vitest';

import { IMAGE_FORMAT, IMAGE_SERVICE, imagePresets } from './images';

describe('content image presets', () => {
  it('keeps Sharp as the only image service and webp as the output format', () => {
    expect(IMAGE_SERVICE).toBe('astro/assets/services/sharp');
    expect(IMAGE_FORMAT).toBe('webp');
  });

  it('serves listing cards at card widths', () => {
    expect(imagePresets.card).toEqual({
      widths: [400, 640, 960],
      sizes: '(max-width: 768px) 100vw, 33vw',
      quality: 80,
      format: 'webp',
    });
  });

  it('serves the featured band at featured widths', () => {
    expect(imagePresets.featured).toEqual({
      widths: [640, 960, 1280],
      sizes: '(max-width: 1024px) 100vw, 55vw',
      quality: 80,
      format: 'webp',
    });
  });

  it('serves post and recipe heroes at detail widths', () => {
    expect(imagePresets.detail).toEqual({
      widths: [640, 1040, 1600],
      sizes: '(max-width: 1040px) 100vw, 1040px',
      quality: 80,
      format: 'webp',
    });
  });
});
