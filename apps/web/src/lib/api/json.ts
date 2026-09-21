export function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}

export function emptyResponse(status: number): Response {
  return new Response(null, { status });
}

export function methodNotAllowed(): Response {
  return jsonResponse({ error: 'Method not allowed' }, 405, { Allow: 'POST' });
}

/**
 * Read a request body as an object. Accepts JSON (the islands) and form encoding (the plain
 * HTML forms when JavaScript is unavailable), so both submit paths reach the same validation.
 * Numeric-looking form values stay strings; the Zod schemas coerce where they need to.
 */
export async function readJsonBody(
  request: Request,
): Promise<{ ok: true; body: unknown } | { ok: false }> {
  const contentType = request.headers.get('content-type') ?? '';
  try {
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const form = await request.formData();
      const body: Record<string, string> = {};
      form.forEach((value, key) => {
        if (typeof value === 'string') body[key] = value;
      });
      return { ok: true, body };
    }
    return { ok: true, body: await request.json() };
  } catch {
    return { ok: false };
  }
}
