import type { SecurityHeadersConfig, SecurityHeadersOptions } from './types';

function buildHSTSHeader(config: SecurityHeadersConfig['hsts']): string {
  const parts = [`max-age=${config.maxAge}`];

  if (config.includeSubDomains) {
    parts.push('includeSubDomains');
  }

  if (config.preload) {
    parts.push('preload');
  }

  return parts.join('; ');
}

function buildPermissionsPolicyHeader(policy: Record<string, string[]>): string {
  return Object.entries(policy)
    .map(([feature, origins]) => {
      if (origins.length === 0) {
        return `${feature}=()`;
      }
      return `${feature}=(${origins.join(' ')})`;
    })
    .join(', ');
}

export function generateSecurityHeaders(
  config: SecurityHeadersConfig,
  _options: SecurityHeadersOptions = {},
): Record<string, string> {
  void _options;

  return {
    'Strict-Transport-Security': buildHSTSHeader(config.hsts),
    'Referrer-Policy': config.referrerPolicy,
    'X-Frame-Options': config.frameOptions,
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Permissions-Policy': buildPermissionsPolicyHeader(config.permissionsPolicy),
  };
}

export function createSecurityHeadersConfig(): SecurityHeadersConfig {
  return {
    hsts: {
      maxAge: 63072000,
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: 'strict-origin-when-cross-origin',
    frameOptions: 'DENY',
    permissionsPolicy: {
      camera: [],
      microphone: [],
      geolocation: [],
    },
  };
}

export function validateSecurityHeadersConfig(config: SecurityHeadersConfig): boolean {
  if (config.hsts.maxAge < 31536000) {
    return false;
  }

  if (!config.referrerPolicy || !config.frameOptions) {
    return false;
  }

  return true;
}
