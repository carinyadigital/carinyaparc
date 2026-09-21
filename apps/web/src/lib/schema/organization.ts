import { ORG_LOGO_WIDTH, ORG_LOGO_HEIGHT } from '../constants';

export interface OrganizationSchema {
  '@context': string;
  '@type': string;
  name: string;
  url: string;
  logo: {
    '@type': 'ImageObject';
    url: string;
    width: number;
    height: number;
  };
  sameAs?: string[];
}

export function generateOrganizationSchema(config: {
  name: string;
  url: string;
  logoUrl: string;
  sameAs?: string[];
}): OrganizationSchema {
  const schema: OrganizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: config.name,
    url: config.url,
    logo: {
      '@type': 'ImageObject',
      url: config.logoUrl,
      width: ORG_LOGO_WIDTH,
      height: ORG_LOGO_HEIGHT,
    },
  };

  if (config.sameAs && config.sameAs.length > 0) {
    schema.sameAs = config.sameAs;
  }

  return schema;
}
