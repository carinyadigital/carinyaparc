/**
 * A journal archive is a tag or category list of stories. One story already
 * has its own page, so an archive that only repeats it is a thin copy and
 * stays out of search results. Fewer than two stories is too thin to index.
 */
export function isThinJournalArchive(postCount: number): boolean {
  return postCount < 2;
}
