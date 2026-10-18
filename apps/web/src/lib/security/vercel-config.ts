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

export interface VercelJson {
  headers: VercelHeadersRule[];
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

/** Header rules merged into the Vercel Build Output config at build time. */
export function generateVercelJson(options: GenerateVercelJsonOptions = {}): VercelJson {
  const reportOnly = options.reportOnly ?? CSP_REPORT_ONLY;

  return {
    headers: [
      {
        source: '/(.*)',
        headers: [...securityHeaderEntries(), cspHeader(reportOnly)],
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
 * Prepend security headers (continue) onto the adapter's Build Output config
 * so they apply on every route.
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

  return {
    ...output,
    routes: [headerRoute, ...(output.routes ?? [])],
  };
}
