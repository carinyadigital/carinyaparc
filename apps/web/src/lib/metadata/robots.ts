import type { RobotsMetadata } from './types';

interface RobotsConfig {
  index?: boolean;
  follow?: boolean;
  noarchive?: boolean;
  nosnippet?: boolean;
  noimageindex?: boolean;
  nocache?: boolean;
  googleBotOptions?: RobotsMetadata['googleBot'];
}

export function generateRobots(config: RobotsConfig = {}): RobotsMetadata {
  const {
    index = true,
    follow = true,
    noarchive = false,
    nosnippet = false,
    noimageindex = false,
    nocache = false,
    googleBotOptions = {
      index,
      follow,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  } = config;

  return {
    index,
    follow,
    noarchive,
    nosnippet,
    noimageindex,
    nocache,
    googleBot: googleBotOptions,
  };
}
