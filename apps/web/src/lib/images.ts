/**
 * Shared delivery settings for post and recipe photographs.
 *
 * Card, featured and detail layouts each have one preset of widths, sizes and quality.
 * Sharp, Astro's built-in image service, encodes those files as webp. Do not add another
 * image optimiser or service beside it.
 */

export const IMAGE_SERVICE = 'astro/assets/services/sharp' as const;

/** Astro's default output from Sharp. */
export const IMAGE_FORMAT = 'webp' as const;

export interface ContentImagePreset {
  widths: number[];
  sizes: string;
  quality: number;
  format: typeof IMAGE_FORMAT;
}

/** Listing cards, the featured band, and article or recipe heroes. */
export const imagePresets: Record<'card' | 'featured' | 'detail', ContentImagePreset> = {
  card: {
    widths: [400, 640, 960],
    sizes: '(max-width: 768px) 100vw, 33vw',
    quality: 80,
    format: IMAGE_FORMAT,
  },
  featured: {
    widths: [640, 960, 1280],
    sizes: '(max-width: 1024px) 100vw, 55vw',
    quality: 80,
    format: IMAGE_FORMAT,
  },
  detail: {
    widths: [640, 1040, 1600],
    sizes: '(max-width: 1040px) 100vw, 1040px',
    quality: 80,
    format: IMAGE_FORMAT,
  },
};

/**
 * Candidates a phone may download for the homepage hero.
 *
 * The hero is full-bleed, so a 3× phone asks for roughly 1200 pixels and would
 * otherwise skip 1080 and take the 1600-wide file. This set stops at 1080.
 * Wider screens keep the full hero set.
 */
export const homeHeroPhone = {
  media: '(max-width: 767px)',
  widths: [640, 1080],
} as const;
