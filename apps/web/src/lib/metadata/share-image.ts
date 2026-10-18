import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';

import heroHome from '@/assets/images/hero-home.jpg';
import { DEFAULT_OG_IMAGE_ALT } from '@/lib/constants';
import { socialImageCrop, socialImageSize } from '@/lib/metadata/social-image';

export interface ShareImage {
  src: string;
  width: number;
  height: number;
}

/** Centre-cropped 1200×630 JPEG for a social preview. */
export async function buildShareImage(src: ImageMetadata): Promise<ShareImage> {
  const built = await getImage({ src, ...socialImageCrop });
  return {
    src: built.src,
    width: socialImageSize(built.attributes.width, socialImageCrop.width),
    height: socialImageSize(built.attributes.height, socialImageCrop.height),
  };
}

const builtDefault = await buildShareImage(heroHome);

/** Site photograph used when a page does not pass its own. */
export const defaultShareImage = {
  ...builtDefault,
  alt: DEFAULT_OG_IMAGE_ALT,
};
