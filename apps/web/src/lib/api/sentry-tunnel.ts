import { jsonResponse, methodNotAllowed } from '@/lib/api/json';
import { SENTRY_TUNNEL_PATH } from '@/lib/urls';

/** Envelopes stay under the platform request-body limit, with room for a replay. */
export const MAX_SENTRY_TUNNEL_BODY_BYTES = 4_000_000;

/**
 * Fixed window. The shared email limiter extends its window on every hit, which
 * would eventually drop a long browsing session that keeps sending envelopes.
 */
export const SENTRY_TUNNEL_MAX_PER_WINDOW = 300;
const WINDOW_MS = 60_000;
const MAX_HEADER_BYTES = 8_192;

export type SentryIngestTarget = {
  host: string;
  projectId: string;
  publicKey: string;
};

type Bucket = {
  windowStart: number;
  count: number;
};

const buckets = new Map<string, Bucket>();

/** Test helper — clears the per-instance tunnel rate-limit window. */
export function resetSentryTunnelRateLimit(): void {
  buckets.clear();
}

/**
 * Accept only the project's own Sentry ingest DSN.
 * The tunnel builds the upstream URL from this value, never from the envelope,
 * so a crafted body cannot turn the route into an open proxy.
 */
export function parseSentryIngestTarget(dsn: string): SentryIngestTarget | null {
  let url: URL;
  try {
    url = new URL(dsn);
  } catch {
    return null;
  }

  if (url.protocol !== 'https:' || url.port !== '') return null;
  if (url.username === '' || url.password !== '') return null;

  const host = url.hostname.toLowerCase();
  if (host !== 'sentry.io' && !host.endsWith('.sentry.io')) return null;

  const projectId = url.pathname.replace(/^\/+|\/+$/g, '');
  if (!/^\d+$/.test(projectId)) return null;

  return {
    host,
    projectId,
    publicKey: safeDecode(url.username),
  };
}

export function sentryEnvelopeUrl(target: SentryIngestTarget): string {
  return `https://${target.host}/api/${target.projectId}/envelope/`;
}

export function targetsMatch(
  envelope: SentryIngestTarget,
  configured: SentryIngestTarget,
): boolean {
  return (
    envelope.host === configured.host &&
    envelope.projectId === configured.projectId &&
    envelope.publicKey === configured.publicKey
  );
}

function configuredTarget(): SentryIngestTarget | null {
  const dsn = (process.env.SENTRY_DSN || process.env.PUBLIC_SENTRY_DSN || '').trim();
  if (!dsn) return null;
  return parseSentryIngestTarget(dsn);
}

function clientKey(request: Request): string {
  const realIp = request.headers.get('x-real-ip')?.trim();
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = realIp || forwarded || 'unknown';
  return ip.slice(0, 64).toLowerCase();
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  if (buckets.size > 1000) {
    for (const [storedKey, bucket] of buckets) {
      if (now - bucket.windowStart >= WINDOW_MS) buckets.delete(storedKey);
    }
  }

  const bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    buckets.set(key, { windowStart: now, count: 1 });
    return false;
  }

  bucket.count += 1;
  return bucket.count > SENTRY_TUNNEL_MAX_PER_WINDOW;
}

function readEnvelopeHeader(body: Uint8Array): string | null {
  const newline = body.indexOf(0x0a);
  if (newline <= 0 || newline > MAX_HEADER_BYTES) return null;

  let line: string;
  try {
    line = new TextDecoder('utf-8', { fatal: true }).decode(body.subarray(0, newline));
  } catch {
    return null;
  }

  let header: unknown;
  try {
    header = JSON.parse(line.replace(/\r$/, ''));
  } catch {
    return null;
  }

  if (!header || typeof header !== 'object' || Array.isArray(header)) return null;
  const dsn = (header as { dsn?: unknown }).dsn;
  return typeof dsn === 'string' ? dsn : null;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return copy;
}

function emptyTunnelResponse(status: number): Response {
  return new Response(null, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function reject(status: number, error: string, reason: string): Response {
  console.warn({ event: 'sentry_tunnel_rejected', reason, path: SENTRY_TUNNEL_PATH });
  return jsonResponse({ error }, status);
}

/**
 * Forward a browser Sentry envelope to the configured project.
 * The body is passed through unchanged, including binary replay attachments.
 */
export async function handleSentryTunnelPost(
  request: Request,
  options: { maxBodyBytes?: number } = {},
): Promise<Response> {
  const maxBodyBytes = options.maxBodyBytes ?? MAX_SENTRY_TUNNEL_BODY_BYTES;

  if (isRateLimited(clientKey(request))) {
    return reject(429, 'Too many requests', 'rate_limited');
  }

  const configured = configuredTarget();
  if (!configured) {
    return reject(503, 'Error reporting is not configured', 'dsn_missing');
  }

  const declaredLength = request.headers.get('content-length');
  if (declaredLength && Number(declaredLength) > maxBodyBytes) {
    return reject(413, 'Payload too large', 'too_large');
  }

  let body: Uint8Array;
  try {
    body = new Uint8Array(await request.arrayBuffer());
  } catch {
    return reject(400, 'Invalid report', 'body_unreadable');
  }

  if (body.byteLength === 0) {
    return reject(400, 'Invalid report', 'empty_body');
  }

  if (body.byteLength > maxBodyBytes) {
    return reject(413, 'Payload too large', 'too_large');
  }

  const envelopeDsn = readEnvelopeHeader(body);
  const envelopeTarget = envelopeDsn ? parseSentryIngestTarget(envelopeDsn) : null;
  if (!envelopeTarget || !targetsMatch(envelopeTarget, configured)) {
    return reject(400, 'Invalid report', 'dsn_rejected');
  }

  const upstreamUrl = sentryEnvelopeUrl(configured);
  const payload = toArrayBuffer(body);

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      method: 'POST',
      body: payload,
      redirect: 'manual',
      signal: AbortSignal.timeout(10_000),
      headers: { 'Content-Type': 'application/x-sentry-envelope' },
    });
  } catch {
    console.warn({ event: 'sentry_tunnel_upstream', reason: 'fetch_failed' });
    return jsonResponse({ error: 'Could not deliver the report' }, 502);
  }

  await upstream.body?.cancel().catch(() => undefined);

  if (upstream.status >= 300 && upstream.status < 400) {
    console.warn({ event: 'sentry_tunnel_upstream', reason: 'redirect' });
    return jsonResponse({ error: 'Could not deliver the report' }, 502);
  }

  if (upstream.status < 200 || upstream.status >= 600) {
    console.warn({ event: 'sentry_tunnel_upstream', reason: 'unexpected_status' });
    return jsonResponse({ error: 'Could not deliver the report' }, 502);
  }

  return emptyTunnelResponse(upstream.status);
}

export function handleSentryTunnelGet(): Response {
  return methodNotAllowed();
}
