import { describe, expect, it } from 'vitest';

import { SOCIAL_LINKS } from '../constants';
import { ORGANIZATION_SCHEMA_JSON } from './organization-json';

describe('organization schema social profiles', () => {
  it('uses the same profiles the site links, with no GitHub address', () => {
    const schema = JSON.parse(ORGANIZATION_SCHEMA_JSON) as { sameAs?: string[] };

    expect(schema.sameAs).toEqual(SOCIAL_LINKS.map((link) => link.href));
    expect(schema.sameAs).toContain('https://www.facebook.com/carinyaparc');
    expect(schema.sameAs?.some((href) => href.includes('github.com'))).toBe(false);
  });
});
