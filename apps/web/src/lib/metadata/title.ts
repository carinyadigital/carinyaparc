export function generateTitle(siteName: string, pageTitle?: string): string {
  return pageTitle ? `${pageTitle} | ${siteName}` : siteName;
}

/**
 * About how many characters of a title link a search result still shows.
 * Google sizes the link in pixels. Sixty characters is the length that still fits.
 */
export const SEARCH_RESULT_TITLE_MAX = 60;

/**
 * Document title that keeps the page name visible in a search result.
 * The site name follows only when the combined title is within
 * `SEARCH_RESULT_TITLE_MAX`. A page name that is already longer than that
 * budget is returned whole, because cutting it would hide the name.
 */
export function searchResultTitle(pageTitle: string, siteName: string): string {
  const withSite = `${pageTitle} | ${siteName}`;
  if (withSite.length <= SEARCH_RESULT_TITLE_MAX) return withSite;
  return pageTitle;
}
