/**
 * Payload admin and GraphQL were removed with the Astro cut-over. Returning
 * Gone tells crawlers these URLs are permanently retired rather than missing.
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
