import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/team/', '/chat/', '/inbox/', '/entries', '/user-id', '/api/', '/post/', '/appeal'],
    }],
    sitemap: 'https://tambayanslu.com/sitemap.xml',
    host: 'https://tambayanslu.com',
  };
}
