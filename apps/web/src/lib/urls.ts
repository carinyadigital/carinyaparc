/** Public content URLs always include a trailing slash so they match `trailingSlash: 'always'`. */
export function postUrl(slug: string): string {
  return `/blog/${slug}/`;
}

export function categoryUrl(slug: string): string {
  return `/blog/category/${slug}/`;
}

export function tagUrl(tag: string): string {
  return `/blog/tag/${tag}/`;
}

export function recipeUrl(slug: string): string {
  return `/recipes/${slug}/`;
}

export function eventsListingUrl(): string {
  return '/get-involved/events/';
}

/**
 * On-demand API paths always include a trailing slash so POST is not 308'd
 * (and converted to GET) under `trailingSlash: 'always'`.
 */
export const API_CONTACT_PATH = '/api/contact/';
export const API_SUBSCRIBE_PATH = '/api/subscribe/';
export const API_EVENT_SIGNUP_PATH = '/api/events/signup/';
export const API_CSP_REPORT_PATH = '/api/csp-report/';
