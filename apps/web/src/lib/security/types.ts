export interface NonceContext {
  /** Cryptographically secure uuid v4 nonce */
  nonce: string;
  /** Unix timestamp (ms) when nonce was generated */
  timestamp: number;
  /** Optional correlation ID for distributed tracing */
  requestId?: string;
}

export type CSPDirective =
  | 'default-src'
  | 'script-src'
  | 'style-src'
  | 'img-src'
  | 'font-src'
  | 'connect-src'
  | 'frame-src'
  | 'object-src'
  | 'base-uri'
  | 'form-action';

export interface CSPConfig {
  /** CSP directives mapping directive names to allowed sources */
  directives: Record<string, string[]>;
  /** Whether to use Content-Security-Policy-Report-Only header */
  reportOnly?: boolean;
  /** URI to send CSP violation reports to */
  reportUri?: string;
}

export interface CSPResult {
  /** The header name (Content-Security-Policy or Content-Security-Policy-Report-Only) */
  headerName: string;
  /** The complete CSP header value */
  headerValue: string;
  /**
   * Reserved for callers that still mint a request nonce.
   * Public CSP does not inject script nonces (prerendered pages cannot stamp them).
   */
  nonce: string;
}

export interface SecurityHeadersConfig {
  hsts: {
    maxAge: number;
    includeSubDomains: boolean;
    preload: boolean;
  };
  referrerPolicy:
    | 'no-referrer'
    | 'no-referrer-when-downgrade'
    | 'origin'
    | 'origin-when-cross-origin'
    | 'same-origin'
    | 'strict-origin'
    | 'strict-origin-when-cross-origin'
    | 'unsafe-url';
  frameOptions: 'DENY' | 'SAMEORIGIN';
  permissionsPolicy: Record<string, string[]>;
}

export interface SecurityHeadersOptions {
  nonce?: string;
  environment?: 'development' | 'production';
}
