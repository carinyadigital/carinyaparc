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

  it('leaves Recipe out of the graph when the dish has no photograph', () => {
    const json = generateJsonLd('recipe', {
      org: {
        name: SITE_TITLE,
        url: 'https://carinyaparc.com.au',
        logoUrl: 'https://carinyaparc.com.au/favicon/favicon-512x512.png',
      },
      breadcrumb: [{ name: 'Home', url: 'https://carinyaparc.com.au/', position: 1 }],
      recipe: {
        name: 'Herbed omelette',
        description: 'Bought eggs and native greens. Nothing in it comes from the property yet.',
        author: 'Jonno',
      },
    });

    const parsed = JSON.parse(json) as { '@graph': Array<{ '@type': string } | null> };
    const types = parsed['@graph'].map((node) => node?.['@type']);

    expect(types).toContain('BreadcrumbList');
    expect(types).not.toContain('Recipe');
    expect(parsed['@graph']).not.toContain(null);
  });

  it('places the LocalBusiness pin on 315 Warraba Road', () => {
    // Parcel centroid of lot 7 DP718145, NSW Spatial Services. Not a surveyed gate.
    expect(LOCAL_BUSINESS.address.streetAddress).toBe('315 Warraba Road');
    expect(LOCAL_BUSINESS.address.addressLocality).toBe('The Branch');
    expect(LOCAL_BUSINESS.geo).toEqual({ latitude: -32.53684, longitude: 152.0023 });
  });
});
