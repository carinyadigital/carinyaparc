import {
  BASE_URL,
  SITE_TITLE,
  ORG_LOGO_URL,
  ORG_LOGO_WIDTH,
  ORG_LOGO_HEIGHT,
  DEFAULT_ARTICLE_SECTION,
  DEFAULT_ARTICLE_WORD_COUNT,
  DEFAULT_ARTICLE_KEYWORDS,
  DEFAULT_ARTICLE_IMAGE,
  DEFAULT_AUTHOR_NAME,
  DEFAULT_AUTHOR_URL_PATH,
  ARTICLE_ABOUT_TOPIC,
  BLOG_NAME,
  BLOG_URL_PATH,
} from '../constants';
import { postUrl } from '../urls';

export interface ArticleSchema {
  '@context': string;
  '@type': string;
  headline: string;
  description: string;
  author: {
    '@type': string;
    name: string;
    url?: string;
  };
  publisher: {
    '@type': string;
    name: string;
    url: string;
    logo: {
      '@type': string;
      url: string;
      width: number;
      height: number;
    };
  };
  datePublished: string;
  dateModified?: string;
  mainEntityOfPage?: {
    '@type': string;
    '@id': string;
  };
  url: string;
  image?: string;
  articleSection?: string;
  wordCount?: number;
  articleBody?: string;
  keywords?: string;
  about?: {
    '@type': string;
    name: string;
    description: string;
  };
  isPartOf?: {
    '@type': string;
    name: string;
    url: string;
  };
}

export function generateArticleSchema(data: {
  title: string;
  slug: string;
  author?: string;
  authorUrl?: string;
  datePublished: string;
  dateModified?: string;
  url?: string;
  imageUrl?: string;
  description?: string;
  excerpt?: string;
  tags?: string[];
  articleSection?: string;
  wordCount?: number;
  content?: string;
}): ArticleSchema {
  const fullUrl = data.url || `${BASE_URL}${postUrl(data.slug)}`;
  const authorName = data.author || DEFAULT_AUTHOR_NAME;
  const authorUrl = data.authorUrl || `${BASE_URL}${DEFAULT_AUTHOR_URL_PATH}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: data.title,
    description: data.excerpt || data.description || `Blog post from ${SITE_TITLE}`,
    author: {
      '@type': 'Person',
      name: authorName,
      url: authorUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_TITLE,
      url: BASE_URL,
      logo: {
        '@type': 'ImageObject',
        url: ORG_LOGO_URL,
        width: ORG_LOGO_WIDTH,
        height: ORG_LOGO_HEIGHT,
      },
    },
    datePublished: data.datePublished,
    dateModified: data.dateModified || data.datePublished,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': fullUrl,
    },
    url: fullUrl,
    image: data.imageUrl
      ? data.imageUrl.startsWith('http')
        ? data.imageUrl
        : `${BASE_URL}${data.imageUrl}`
      : `${BASE_URL}${DEFAULT_ARTICLE_IMAGE}`,
    articleSection: data.articleSection || DEFAULT_ARTICLE_SECTION,
    wordCount:
      data.wordCount ||
      (data.content ? data.content.split(' ').length : DEFAULT_ARTICLE_WORD_COUNT),
    articleBody: data.content,
    keywords: data.tags && data.tags.length > 0 ? data.tags.join(', ') : DEFAULT_ARTICLE_KEYWORDS,
    about: {
      '@type': 'Thing',
      name: ARTICLE_ABOUT_TOPIC.name,
      description: ARTICLE_ABOUT_TOPIC.description,
    },
    isPartOf: {
      '@type': 'Blog',
      name: BLOG_NAME,
      url: `${BASE_URL}${BLOG_URL_PATH}`,
    },
  };
}

export type ArticleData = Parameters<typeof generateArticleSchema>[0];
