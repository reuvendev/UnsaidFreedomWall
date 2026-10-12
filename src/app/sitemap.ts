import type { MetadataRoute } from 'next';
import { getArticleCatalog } from './articles/article-data';

export const revalidate = 3600;

const baseUrl = 'https://www.tambayanslu.com';
const publicPaths = [
  '/', '/wall', '/articles', '/about', '/how-it-works', '/guidelines',
  '/faq', '/privacy', '/contact', '/credits', '/support',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = publicPaths.map((path) => ({
    url: `${baseUrl}${path === '/' ? '' : path}`,
  }));

  try {
    const articles = await getArticleCatalog();
    for (const article of articles) {
      pages.push({
        url: `${baseUrl}/articles/${encodeURIComponent(article.slug)}`,
        ...((article.updatedAt ?? article.createdAt) !== null
          ? { lastModified: new Date(article.updatedAt ?? article.createdAt!) } : {}),
      });
    }
  } catch (error) {
    console.error('Could not load articles for sitemap:', error);
  }

  return pages;
}
