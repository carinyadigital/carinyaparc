import { SITE_TITLE, BASE_URL, DEFAULT_OG_IMAGE_ALT } from '../constants';
import { defaultShareImage } from './share-image';
import type { OpenGraphImage, OpenGraphMetadata } from './types';

interface OpenGraphConfig {
  url: string;
  title: string;
  description: string;
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  imageAlt?: string;
  images?: OpenGraphImage[];
  siteName?: string;
  locale?: string;
  type?: 'website' | 'article' | 'book' | 'profile';
  /** ISO 8601 publish time. Included only when `type` is `article`. */
  publishedTime?: string;
  /** Author display names. Included only when `type` is `article`. */
  authors?: readonly string[];
}

export function generateOpenGraph(config: OpenGraphConfig): OpenGraphMetadata {
  const {
    url,
    title,
    description,
    imageUrl,
    imageWidth,
    imageHeight,
    imageAlt,
    images = [],
    siteName = SITE_TITLE,
    locale = 'en_AU',
    type = 'website',
    publishedTime,
    authors,
  } = config;

  const allImages: OpenGraphImage[] = imageUrl
    ? [
        {
          url: imageUrl,
          ...(imageWidth ? { width: imageWidth } : {}),
          ...(imageHeight ? { height: imageHeight } : {}),
          alt: imageAlt ?? title,
        },
        ...images,
      ]
    : images.length > 0
      ? images
      : [
          {
            url: `${BASE_URL}${defaultShareImage.src}`,
            width: imageWidth ?? defaultShareImage.width,
            height: imageHeight ?? defaultShareImage.height,
            alt: imageAlt ?? DEFAULT_OG_IMAGE_ALT,
          },
        ];

  const articleAuthors = authors
    ?.map((author) => author.trim())
    .filter((author) => author.length > 0);

  return {
    title,
    description,
    url,
    images: allImages,
    siteName,
    locale,
    type,
    ...(type === 'article' && publishedTime ? { publishedTime } : {}),
    ...(type === 'article' && articleAuthors && articleAuthors.length > 0
      ? { authors: articleAuthors }
      : {}),
  };
}
