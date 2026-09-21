import {
  SITE_TITLE,
  DEFAULT_OG_IMAGE,
  DEFAULT_OG_IMAGE_WIDTH,
  DEFAULT_OG_IMAGE_HEIGHT,
} from '../constants';
import type { OpenGraphImage, OpenGraphMetadata } from './types';

interface OpenGraphConfig {
  url: string;
  title: string;
  description: string;
  imageUrl?: string;
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
          width: DEFAULT_OG_IMAGE_WIDTH,
          height: DEFAULT_OG_IMAGE_HEIGHT,
          alt: title,
        },
        ...images,
      ]
    : images.length > 0
      ? images
      : [
          {
            url: DEFAULT_OG_IMAGE,
            width: DEFAULT_OG_IMAGE_WIDTH,
            height: DEFAULT_OG_IMAGE_HEIGHT,
            alt: title,
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
