/**
 * A search result shows about sixty characters of a document title.
 * Past that, the story name is what gets cut off.
 */
const SEARCH_RESULT_TITLE_LENGTH = 60;

export function generateTitle(siteName: string, pageTitle?: string): string {
  return pageTitle ? `${pageTitle} | ${siteName}` : siteName;
}

/**
 * Document title for a journal story. The site name is added only when the
 * whole title still fits a search result. A longer story keeps its name
 * alone, and the name is not shortened, so a searcher can tell which story
 * it is.
 */
export function journalStoryTitle(storyTitle: string, siteName: string): string {
  const withSiteName = `${storyTitle} | ${siteName}`;
  if (withSiteName.length <= SEARCH_RESULT_TITLE_LENGTH) return withSiteName;
  return storyTitle;
}
