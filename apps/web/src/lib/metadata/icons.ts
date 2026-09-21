import { APPLE_TOUCH_ICON_PATH, FAVICON_ICO_PATH, FAVICON_192_PATH } from '../constants';
import type { IconsMetadata } from './types';

interface IconsConfig {
  icon?: string;
  shortcut?: string;
  apple?: string;
  other?: IconsMetadata['other'];
}

export function generateIcons(config: IconsConfig = {}): IconsMetadata {
  const {
    icon = FAVICON_ICO_PATH,
    shortcut = FAVICON_192_PATH,
    apple = APPLE_TOUCH_ICON_PATH,
    other = [],
  } = config;

  return {
    icon,
    shortcut,
    apple,
    other,
  };
}
