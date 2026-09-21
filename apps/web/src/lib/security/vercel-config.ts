import { buildCSPHeader } from './csp';
import { CSP_DIRECTIVES, CSP_REPORT_ONLY, CSP_REPORT_URI } from './constants';
import { createSecurityHeadersConfig, generateSecurityHeaders } from './headers';

export interface VercelHeaderEntry {
  key: string;
  value: string;
}

export interface VercelHeadersRule {
  source: string;
  headers: VercelHeaderEntry[];
}

export interface VercelRedirect {
  source: string;
  destination: string;
  permanent: boolean;
}

export interface VercelJson {
  $schema: string;
  trailingSlash: boolean;
  headers: VercelHeadersRule[];
  redirects: VercelRedirect[];
}

export interface VercelOutputRoute {
  src?: string;
  dest?: string;
  headers?: Record<string, string>;
  status?: number;
  continue?: boolean;
  handle?: string;
  [key: string]: unknown;
}

export interface VercelOutputConfig {
  version?: number;
  routes?: VercelOutputRoute[];
  [key: string]: unknown;
}

/**
 * Retired admin and GraphQL paths. Matching requests return HTTP 410 at the CDN
 * (and from the on-demand Astro endpoints used by local preview).
 */
export const GONE_PATH_PATTERNS = [
  '^/admin(?:/.*)?$',
  '^/api/graphql(?:-playground)?(?:/.*)?$',
] as const;

export interface GenerateVercelJsonOptions {
  /** When true, emit Content-Security-Policy-Report-Only instead of enforcing. */
  reportOnly?: boolean;
}

function cspHeader(reportOnly: boolean): VercelHeaderEntry {
  const result = buildCSPHeader({
    directives: CSP_DIRECTIVES.BALANCED,
    reportOnly,
    reportUri: CSP_REPORT_URI,
  });

  return { key: result.headerName, value: result.headerValue };
}

function securityHeaderEntries(): VercelHeaderEntry[] {
  return Object.entries(generateSecurityHeaders(createSecurityHeadersConfig())).map(
    ([key, value]) => ({ key, value }),
  );
}

/** Shape written to `vercel.json` and merged into the Vercel Build Output config. */
export function generateVercelJson(options: GenerateVercelJsonOptions = {}): VercelJson {
  const reportOnly = options.reportOnly ?? CSP_REPORT_ONLY;

  return {
    $schema: 'https://openapi.vercel.sh/vercel.json',
    trailingSlash: true,
    headers: [
      {
        source: '/(.*)',
        headers: [...securityHeaderEntries(), cspHeader(reportOnly)],
      },
    ],
    redirects: [
      {
        source: '/favicon.ico',
        destination: '/favicon/favicon.ico',
        permanent: true,
      },
    ],
  };
}

function headerMapFromVercelJson(config: VercelJson): Record<string, string> {
  const rule = config.headers[0];
  const map: Record<string, string> = {};
  for (const entry of rule?.headers ?? []) {
    map[entry.key] = entry.value;
  }
  return map;
}

/**
 * Prepend security headers (continue) and Gone routes onto the adapter's
 * Build Output config so they apply even when the platform ignores vercel.json.
 */
export function mergeSecurityIntoVercelOutput(
  output: VercelOutputConfig,
  options: GenerateVercelJsonOptions = {},
): VercelOutputConfig {
  const vercelJson = generateVercelJson(options);
  const headerRoute: VercelOutputRoute = {
    src: '/(.*)',
    headers: headerMapFromVercelJson(vercelJson),
    continue: true,
  };
  const goneRoutes: VercelOutputRoute[] = GONE_PATH_PATTERNS.map((src) => ({
    src,
    status: 410,
  }));

  return {
    ...output,
    routes: [headerRoute, ...goneRoutes, ...(output.routes ?? [])],
  };
}
