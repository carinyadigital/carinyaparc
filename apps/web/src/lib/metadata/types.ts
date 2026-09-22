export type OpenGraphImage = {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
};

export type OpenGraphMetadata = {
  title: string;
  description: string;
  url: string;
  images: OpenGraphImage[];
  siteName: string;
  locale: string;
  type: 'website' | 'article' | 'book' | 'profile';
  /** ISO 8601. Rendered as `article:published_time` when `type` is `article`. */
  publishedTime?: string;
  /** One `article:author` tag per name when `type` is `article`. */
  authors?: string[];
};

export type TwitterMetadata = {
  card: 'summary' | 'summary_large_image' | 'app' | 'player';
  site: string;
  creator: string;
  title?: string;
  description?: string;
  images?: string[];
};

export type RobotsMetadata = {
  index: boolean;
  follow: boolean;
  noarchive: boolean;
  nosnippet: boolean;
  noimageindex: boolean;
  nocache: boolean;
  googleBot: {
    index?: boolean;
    follow?: boolean;
    noimageindex?: boolean;
    'max-video-preview'?: number | 'none' | 'standard';
    'max-image-preview'?: 'none' | 'standard' | 'large';
    'max-snippet'?: number;
  };
};

export type IconsMetadata = {
  icon: string;
  shortcut: string;
  apple: string;
  other: Array<{
    rel: string;
    url: string;
    sizes?: string;
    type?: string;
  }>;
};

export type PageMetadata = {
  title: string;
  titleTemplate: string;
  description: string;
  keywords: string[];
  canonical?: string;
  rssFeed: string;
  openGraph: OpenGraphMetadata;
  twitter: TwitterMetadata;
  robots: RobotsMetadata;
  manifest: string;
  icons: IconsMetadata;
  themeColor: string;
};
