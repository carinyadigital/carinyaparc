import { SOCIAL_IMAGE_HEIGHT, SOCIAL_IMAGE_WIDTH } from '../constants';

/** Options spread into `getImage` for a post or recipe share preview. */
export const socialImageCrop = {
  width: SOCIAL_IMAGE_WIDTH,
  height: SOCIAL_IMAGE_HEIGHT,
  fit: 'cover' as const,
  position: 'centre',
  format: 'jpg' as const,
};

/** Pixel size from an image-service attribute, or the crop size when it is missing. */
export function socialImageSize(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
}
