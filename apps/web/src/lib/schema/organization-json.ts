import { generateOrganizationSchema } from './organization';
import { FAVICON_512_PATH, ORG_SOCIAL_PROFILES, SITE_TITLE } from '../constants';

const CANONICAL_SITE_URL = 'https://carinyaparc.com.au';

const organizationSchema = generateOrganizationSchema({
  name: SITE_TITLE,
  url: CANONICAL_SITE_URL,
  logoUrl: `${CANONICAL_SITE_URL}${FAVICON_512_PATH}`,
  sameAs: ORG_SOCIAL_PROFILES,
});

/** Stable JSON-LD payload for the site-wide Organization schema in `<head>`. */
export const ORGANIZATION_SCHEMA_JSON = JSON.stringify(organizationSchema);
