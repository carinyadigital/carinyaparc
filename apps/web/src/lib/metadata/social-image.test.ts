import { describe, expect, it } from 'vitest';

import { SOCIAL_IMAGE_HEIGHT, SOCIAL_IMAGE_WIDTH } from '../constants';
import { socialImageCrop, socialImageSize } from './social-image';

describe('socialImageCrop', () => {
  it('centre-crops a share image to 1200 by 630 JPEG', () => {
    expect(socialImageCrop).toEqual({
      width: SOCIAL_IMAGE_WIDTH,
      height: SOCIAL_IMAGE_HEIGHT,
      fit: 'cover',
      position: 'centre',
      format: 'jpg',
    });
    expect(socialImageCrop.width).toBe(1200);
    expect(socialImageCrop.height).toBe(630);
  });
});

describe('socialImageSize', () => {
  it('reads a numeric attribute and falls back when the service omits one', () => {
    expect(socialImageSize(1200, 630)).toBe(1200);
    expect(socialImageSize('630', 1200)).toBe(630);
    expect(socialImageSize(undefined, 1200)).toBe(1200);
  });
});
