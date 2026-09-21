import { describe, expect, it } from 'vitest';

import { generateJsonLd } from './index';
import { LOCAL_BUSINESS, SITE_TITLE } from '../constants';

describe('generateJsonLd', () => {
  it('always includes Organization and BreadcrumbList in the graph', () => {
    const json = generateJsonLd('page', {
      org: {
        name: SITE_TITLE,
        url: 'https://carinyaparc.com.au',
        logoUrl: 'https://carinyaparc.com.au/favicon/favicon-512x512.png',
      },
      breadcrumb: [{ name: 'Home', url: 'https://carinyaparc.com.au/', position: 1 }],
      localBusiness: LOCAL_BUSINESS,
    });

    const parsed = JSON.parse(json) as { '@graph': Array<{ '@type': string }> };
    const types = parsed['@graph'].map((node) => node['@type']);

    expect(types).toContain('Organization');
    expect(types).toContain('BreadcrumbList');
    expect(types).toContain('LocalBusiness');
  });
});
