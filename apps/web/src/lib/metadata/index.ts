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
} from '../constants';

export { viewport };
export type { PageMetadata } from './types';

interface MetadataConfig {
  pageTitle?: string;
  pageDescription?: string;
  path?: string;
  keywords?: string[];
  image?: string;
  type?: 'website' | 'article';
  noIndex?: boolean;
  noFollow?: boolean;
  publishedTime?: string;
  authors?: readonly string[];
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
    type = 'website',
    noIndex = false,
    noFollow = false,
    publishedTime,
    authors,
  } = config;

  const title = pageTitle ? generateTitle(SITE_TITLE, pageTitle) : SITE_TITLE;
  const description = generateDescription(SITE_DESCRIPTION, pageDescription);
  const canonical = generateCanonicalUrl(BASE_URL, path);
  const imageUrl = image ? `${BASE_URL}${image}` : `${BASE_URL}${DEFAULT_OG_IMAGE}`;

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
      imageUrl,
      type,
      publishedTime,
      authors,
    }),
    twitter: generateTwitterCard({
      title,
      description,
      images: [imageUrl],
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
  type = 'website',
  keywords = [],
  publishedTime,
  authors,
  noIndex = false,
  noFollow = false,
  omitCanonical = false,
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: 'website' | 'article';
  keywords?: string[];
  publishedTime?: string;
  authors?: readonly string[];
  noIndex?: boolean;
  noFollow?: boolean;
  /**
   * Skip the canonical URL. The not-found document is one static file reused for
   * every unknown path, so pointing those responses at the error-template URL
   * would tell crawlers that missing addresses consolidate onto that template.
   */
  omitCanonical?: boolean;
}): PageMetadata {
  const pageUrl = generateCanonicalUrl(BASE_URL, path);
  const canonical = omitCanonical ? undefined : pageUrl;
  const imageUrl = image ? `${BASE_URL}${image}` : `${BASE_URL}${DEFAULT_OG_IMAGE}`;

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
      url: pageUrl,
      imageUrl,
      type,
      publishedTime,
      authors,
    }),
    twitter: generateTwitterCard({
      title,
      description,
      images: [imageUrl],
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
