/**
 * `/admin` and `/api/graphql*` return Gone so crawlers treat those paths as
 * permanently removed rather than missing.
 */
export const GONE_STATUS = 410;
export const GONE_BODY = 'Gone';

export function goneResponse(): Response {
  return new Response(GONE_BODY, {
    status: GONE_STATUS,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
