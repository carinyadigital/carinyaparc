import { generateTitle } from './title';
import { generateDescription } from './description';
import { generateCanonicalUrl } from './canonical';
import { generateOpenGraph } from './openGraph';
import { generateTwitterCard } from './twitter';
import { generateRobots } from './robots';
import { generateIcons } from './icons';
import { viewport } from './viewport';
import type { PageMetadata } from './types';
import {
  SITE_TITLE,
  SITE_DESCRIPTION,
  BASE_URL,
  DEFAULT_KEYWORDS,
  SITE_MANIFEST_PATH,
  DEFAULT_OG_IMAGE,
  DEFAULT_OG_IMAGE_ALT,
  DEFAULT_OG_IMAGE_HEIGHT,
  DEFAULT_OG_IMAGE_WIDTH,
} from '../constants';

export { viewport };
export type { PageMetadata } from './types';

interface MetadataConfig {
  pageTitle?: string;
  pageDescription?: string;
  path?: string;
  keywords?: string[];
  image?: string;
  imageWidth?: number;
  imageHeight?: number;
  imageAlt?: string;
  type?: 'website' | 'article';
  noIndex?: boolean;
  noFollow?: boolean;
  publishedTime?: string;
  authors?: readonly string[];
}

function absoluteImageUrl(image: string): string {
  if (image.startsWith('http://') || image.startsWith('https://')) return image;
  return `${BASE_URL}${image}`;
}

/**
 * A passed hero uses its own size and alt. Pages with no hero keep the site
 * photograph and that file's real dimensions.
 */
function resolveShareImage({
  image,
  imageWidth,
  imageHeight,
  imageAlt,
  fallbackAlt,
}: {
  image?: string;
  imageWidth?: number;
  imageHeight?: number;
  imageAlt?: string;
  fallbackAlt: string;
}): { imageUrl: string; imageWidth?: number; imageHeight?: number; imageAlt: string } {
  if (!image) {
    return {
      imageUrl: `${BASE_URL}${DEFAULT_OG_IMAGE}`,
      imageWidth: DEFAULT_OG_IMAGE_WIDTH,
      imageHeight: DEFAULT_OG_IMAGE_HEIGHT,
      imageAlt: DEFAULT_OG_IMAGE_ALT,
    };
  }

  return {
    imageUrl: absoluteImageUrl(image),
    imageWidth,
    imageHeight,
    imageAlt: imageAlt ?? fallbackAlt,
  };
}

/**
 * Compose page metadata for the HTML head. Pages pass the result into Base.astro.
 */
export function generateMetadata(config: MetadataConfig = {}): PageMetadata {
  const {
    pageTitle,
    pageDescription,
    path = '/',
    keywords = [],
    image,
    imageWidth,
    imageHeight,
    imageAlt,
    type = 'website',
    noIndex = false,
    noFollow = false,
    publishedTime,
    authors,
  } = config;

  const title = pageTitle ? generateTitle(SITE_TITLE, pageTitle) : SITE_TITLE;
  const description = generateDescription(SITE_DESCRIPTION, pageDescription);
  const canonical = generateCanonicalUrl(BASE_URL, path);
  const shareImage = resolveShareImage({
    image,
    imageWidth,
    imageHeight,
    imageAlt,
    fallbackAlt: title,
  });

  return {
    title,
    titleTemplate: `%s | ${SITE_TITLE}`,
    description,
    keywords: [...DEFAULT_KEYWORDS, ...keywords],
    canonical,
    rssFeed: `${BASE_URL}/feed.xml`,
    openGraph: generateOpenGraph({
      title,
      description,
      url: canonical,
      imageUrl: shareImage.imageUrl,
      imageWidth: shareImage.imageWidth,
      imageHeight: shareImage.imageHeight,
      imageAlt: shareImage.imageAlt,
      type,
      publishedTime,
      authors,
    }),
    twitter: generateTwitterCard({
      title,
      description,
      images: [shareImage.imageUrl],
      imageAlt: shareImage.imageAlt,
    }),
    robots: generateRobots({
      index: !noIndex,
      follow: !noFollow,
    }),
    manifest: SITE_MANIFEST_PATH,
    icons: generateIcons(),
    themeColor: viewport.themeColor,
  };
}

/**
 * Page-specific metadata helper. Use when the document title should not include
 * the site-name suffix (home) or when the caller already formatted the title.
 */
export function generatePageMetadata({
  title,
  description,
  path,
  image,
  imageWidth,
  imageHeight,
  imageAlt,
  type = 'website',
  keywords = [],
  publishedTime,
  authors,
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
  imageWidth?: number;
  imageHeight?: number;
  imageAlt?: string;
  type?: 'website' | 'article';
  keywords?: string[];
  publishedTime?: string;
  authors?: readonly string[];
}): PageMetadata {
  const canonical = generateCanonicalUrl(BASE_URL, path);
  const shareImage = resolveShareImage({
    image,
    imageWidth,
    imageHeight,
    imageAlt,
    fallbackAlt: title,
  });

  return {
    title,
    titleTemplate: `%s | ${SITE_TITLE}`,
    description,
    keywords: [...DEFAULT_KEYWORDS, ...keywords],
    canonical,
    rssFeed: `${BASE_URL}/feed.xml`,
    openGraph: generateOpenGraph({
      title,
      description,
      url: canonical,
      imageUrl: shareImage.imageUrl,
      imageWidth: shareImage.imageWidth,
      imageHeight: shareImage.imageHeight,
      imageAlt: shareImage.imageAlt,
      type,
      publishedTime,
      authors,
    }),
    twitter: generateTwitterCard({
      title,
      description,
      images: [shareImage.imageUrl],
      imageAlt: shareImage.imageAlt,
    }),
    robots: generateRobots(),
    manifest: SITE_MANIFEST_PATH,
    icons: generateIcons(),
    themeColor: viewport.themeColor,
  };
}
