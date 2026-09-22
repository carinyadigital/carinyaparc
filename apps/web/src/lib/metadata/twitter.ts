import { TWITTER_HANDLE, TWITTER_CARD_TYPE } from '../constants';
import type { TwitterMetadata } from './types';

interface TwitterCardConfig {
  handle?: string;
  site?: string;
  cardType?: 'summary' | 'summary_large_image' | 'app' | 'player';
  title?: string;
  description?: string;
  images?: string[];
  imageAlt?: string;
}

export function generateTwitterCard(config: TwitterCardConfig = {}): TwitterMetadata {
  const {
    handle = TWITTER_HANDLE,
    site = TWITTER_HANDLE,
    cardType = TWITTER_CARD_TYPE as 'summary' | 'summary_large_image',
    title,
    description,
    images = [],
    imageAlt,
  } = config;

  return {
    card: cardType,
    site,
    creator: handle,
    ...(title && { title }),
    ...(description && { description }),
    ...(images.length > 0 && { images }),
    ...(imageAlt && { imageAlt }),
  };
}
