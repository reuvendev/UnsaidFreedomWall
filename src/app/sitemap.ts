import type { MetadataRoute } from 'next';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const revalidate = 3600;

const baseUrl = 'https://tambayanslu.com';
const publicPaths = [
  '/', '/wall', '/about', '/how-it-works', '/guidelines',
  '/faq', '/privacy', '/contact', '/credits', '/support',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = publicPaths.map((path) => ({
    url: `${baseUrl}${path === '/' ? '' : path}`,
  }));

  try {
    // Existing articles have no publication-status field: documents in this
    // collection are created only when the editor publishes an article.
    // Bound the read; expand pagination if the editorial catalog exceeds 200.
    const snapshot = await getDocs(query(collection(db, 'articles'), orderBy('createdAt', 'desc'), limit(200)));
    for (const doc of snapshot.docs) {
      const article = doc.data();
      if (typeof article.slug !== 'string' || !/^[a-z0-9-]+$/i.test(article.slug) || article.slug.toLowerCase() === 'test') continue;
      if (!article.title || !article.content || article.status === 'draft' || article.published === false) continue;
      pages.push({
        url: `${baseUrl}/articles/${encodeURIComponent(article.slug)}`,
        ...(article.updatedAt?.toDate?.() || article.createdAt?.toDate?.()
          ? { lastModified: article.updatedAt?.toDate?.() || article.createdAt.toDate() }
          : {}),
      });
    }
    if (pages.some((page) => page.url.startsWith(`${baseUrl}/articles/`))) {
      pages.push({ url: `${baseUrl}/articles` });
    }
  } catch (error) {
    console.error('Could not load articles for sitemap:', error);
  }

  return pages;
}
