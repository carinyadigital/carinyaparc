export const SITE_TITLE = 'Carinya Parc';
export const SITE_DESCRIPTION =
  'Carinya Parc is a regenerative farm at The Branch, near Stroud, in the Upper Hunter, NSW. Visit for a planting day or a small-group tour.';

function resolveBaseUrl(): string {
  const fromImportMeta =
    typeof import.meta !== 'undefined'
      ? (import.meta.env?.PUBLIC_SITE_URL as string | undefined)
      : undefined;
  const fromProcess = typeof process !== 'undefined' ? process.env.PUBLIC_SITE_URL : undefined;
  const fromEnv = fromImportMeta || fromProcess;

  if (typeof fromEnv === 'string' && fromEnv.length > 0) {
    return fromEnv.replace(/\/$/, '');
  }

  const isProd =
    (typeof import.meta !== 'undefined' && Boolean(import.meta.env?.PROD)) ||
    (typeof process !== 'undefined' && process.env.NODE_ENV === 'production');

  return isProd ? 'https://carinyaparc.com.au' : 'http://localhost:4321';
}

export const BASE_URL = resolveBaseUrl();

export const DEFAULT_KEYWORDS = [
  'regenerative farming',
  'sustainable agriculture',
  'permaculture',
  'biodiversity',
  'soil health',
  'ecosystem restoration',
  'organic farming',
  'Australia',
  'NSW',
  'The Branch',
  'Stroud',
];

export const PLACEHOLDER_IMAGE = '/images/placeholder.svg';
export const PLACEHOLDER_IMAGE_SVG = '/images/placeholder.svg';
/** Centre-cropped share image. Pages with no photograph stamp these. */
export const SOCIAL_IMAGE_WIDTH = 1200;
export const SOCIAL_IMAGE_HEIGHT = 630;
export const DEFAULT_OG_IMAGE_WIDTH = SOCIAL_IMAGE_WIDTH;
export const DEFAULT_OG_IMAGE_HEIGHT = SOCIAL_IMAGE_HEIGHT;
export const DEFAULT_OG_IMAGE_ALT = 'Carinya Parc regenerative farm landscape';
export const TWITTER_HANDLE = '@carinyaparc';
export const TWITTER_CARD_TYPE = 'summary_large_image';

export const SITE_MANIFEST_PATH = '/site.webmanifest';
export const FAVICON_DIR = '/favicon';
export const FAVICON_ICO_PATH = `${FAVICON_DIR}/favicon.ico`;
export const FAVICON_192_PATH = `${FAVICON_DIR}/favicon-192x192.png`;
export const FAVICON_512_PATH = `${FAVICON_DIR}/favicon-512x512.png`;
export const APPLE_TOUCH_ICON_PATH = `${FAVICON_DIR}/apple-touch-icon-180.png`;

export const ORG_LOGO_URL = `${BASE_URL}${FAVICON_512_PATH}`;
export const ORG_LOGO_WIDTH = 512;
export const ORG_LOGO_HEIGHT = 512;

export const DEFAULT_ARTICLE_SECTION = 'Blog';
export const DEFAULT_ARTICLE_WORD_COUNT = 2000;
export const DEFAULT_ARTICLE_KEYWORDS =
  'regenerative farming, sustainable agriculture, permaculture';
export const DEFAULT_AUTHOR_NAME = 'Jonathan Daddia';
export const DEFAULT_AUTHOR_URL_PATH = '/about/jonathan';

export const ARTICLE_ABOUT_TOPIC = {
  name: 'Regenerative Agriculture',
  description: 'Sustainable farming practices that restore soil health and biodiversity',
};

export const BLOG_NAME = `${SITE_TITLE} Blog`;
export const BLOG_URL_PATH = '/blog';

export const DEFAULT_BREADCRUMB_HOME = { name: 'Home', url: BASE_URL, position: 1 };

export { CONSENT_COOKIE_NAME } from './consent/types';

export const LOCAL_BUSINESS = {
  name: 'Carinya Parc',
  description:
    'Regenerative farm demonstrating ecological restoration, sustainable agriculture, and community building in The Branch, NSW.',
  address: {
    streetAddress: '315 Warraba Road',
    addressLocality: 'The Branch',
    addressRegion: 'NSW',
    postalCode: '2425',
    addressCountry: 'AU',
  },
  // Centroid of lot 7 DP718145 (315 Warraba Road). Not a surveyed gate.
  geo: {
    latitude: -32.53684,
    longitude: 152.0023,
  },
  openingHours: ['By appointment'],
  priceRange: '$$',
};

export const ORG_SOCIAL_PROFILES = [
  'https://www.facebook.com/carinyaparc',
  'https://www.instagram.com/carinyaparc',
];

export const BREADCRUMB_NAME_MAP: Record<string, string> = {
  about: 'About',
  blog: 'Blog',
  recipes: 'Recipes',
  regenerate: 'Regenerate with Us',
  subscribe: 'Subscribe',
  legal: 'Legal',
  'privacy-policy': 'Privacy Policy',
  'terms-of-service': 'Terms of Service',
  jonathan: 'Jonathan Daddia',
  'the-property': 'The Property',
};
