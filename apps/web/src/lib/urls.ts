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
