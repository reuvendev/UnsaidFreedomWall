import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/team/login', '/team/portal', '/chat/', '/inbox/', '/entries', '/user-id', '/api/', '/post/', '/appeal'],
    }],
    sitemap: 'https://www.tambayanslu.com/sitemap.xml',
    host: 'https://www.tambayanslu.com',
  };
}
