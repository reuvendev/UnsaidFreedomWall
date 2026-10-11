import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/chat/',
        '/inbox/',
        '/entries',
        '/pet',
      ],
    },
    sitemap: 'https://www.tambayanslu.com/sitemap.xml',
  };
}
