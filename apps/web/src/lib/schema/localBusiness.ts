import { BASE_URL } from '../constants';

export interface LocalBusinessSchema {
  '@context': string;
  '@type': string;
  name: string;
  description: string;
  url: string;
  address: {
    '@type': string;
    streetAddress: string;
    addressLocality: string;
    addressRegion: string;
    postalCode: string;
    addressCountry: string;
  };
  geo?: {
    '@type': string;
    latitude: number;
    longitude: number;
  };
  openingHours?: string[];
  priceRange?: string;
}

export function generateLocalBusinessSchema(data: {
  name: string;
  description: string;
  address: {
    streetAddress: string;
    addressLocality: string;
    addressRegion: string;
    postalCode: string;
    addressCountry: string;
  };
  geo?: { latitude: number; longitude: number };
  openingHours?: string[];
  priceRange?: string;
}): LocalBusinessSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: data.name,
    description: data.description,
    url: BASE_URL,
    address: {
      '@type': 'PostalAddress',
      ...data.address,
    },
    ...(data.geo && {
      geo: {
        '@type': 'GeoCoordinates',
        ...data.geo,
      },
    }),
    ...(data.openingHours && data.openingHours.length > 0 && { openingHours: data.openingHours }),
    ...(data.priceRange && { priceRange: data.priceRange }),
  };
}
