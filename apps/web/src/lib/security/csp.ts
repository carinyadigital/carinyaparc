import type { NonceContext, CSPConfig, CSPResult } from './types';

/**
 * Generate a cryptographically secure nonce.
 * Kept for callers that still want a request-scoped token; public CSP no longer
 * injects script nonces (prerendered pages cannot stamp them onto scripts).
 */
export function generateNonce(requestId?: string): NonceContext {
  const uuid = crypto.randomUUID();
  const nonce = Buffer.from(uuid).toString('base64');

  return {
    nonce,
    timestamp: Date.now(),
    requestId,
  };
}

export function formatNonceForCSP(nonce: string): string {
  return `'nonce-${nonce}'`;
}

function buildCSPHeaderValue(directives: Record<string, string[]>): string {
  return Object.entries(directives)
    .map(([directive, sources]) => {
      if (sources.length === 0) {
        return directive;
      }
      return `${directive} ${sources.join(' ')}`;
    })
    .join('; ');
}

/**
 * Build a CSP header without script nonce injection.
 * Public routes are prerendered; a per-request nonce would disable
 * `'unsafe-inline'` and block Astro's inline scripts that have no nonce attrs.
 */
export function buildCSPHeader(config: CSPConfig): CSPResult {
  let headerValue = buildCSPHeaderValue(config.directives);

  if (config.reportUri) {
    headerValue += `; report-uri ${config.reportUri}`;
  }

  const headerName = config.reportOnly
    ? 'Content-Security-Policy-Report-Only'
    : 'Content-Security-Policy';

  return {
    headerName,
    headerValue,
    nonce: '',
  };
}

export function validateCSPConfig(config: CSPConfig): boolean {
  if (!config.directives || typeof config.directives !== 'object') {
    return false;
  }

  if (!config.directives['default-src']) {
    return false;
  }

  return true;
}
