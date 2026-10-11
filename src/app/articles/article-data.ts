import 'server-only';
import { cache } from 'react';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { articleTags, resolveArticleCategory } from './categories';
import type { ArticleSummary } from './types';

function millis(value: unknown): number | null {
  return value && typeof (value as { toMillis?: () => number }).toMillis === 'function'
    ? (value as { toMillis: () => number }).toMillis() : null;
}

export function toArticleSummary(id: string, data: DocumentData): ArticleSummary {
  const slug = typeof data.slug === 'string' ? data.slug : '';
  return {
    id,
    slug,
    title: typeof data.title === 'string' ? data.title : 'Untitled',
    category: resolveArticleCategory(data.category, slug),
    readTime: typeof data.readTime === 'string' ? data.readTime : '3 min read',
    excerpt: typeof data.excerpt === 'string' ? data.excerpt : '',
    createdAt: millis(data.createdAt),
    author: typeof data.author === 'string' ? data.author : 'TambayanSLU',
    featured: data.featured === true,
    tags: articleTags(data.tags),
    coverImage: typeof data.coverImage === 'string' && data.coverImage.startsWith('https://cdn.tambayanslu.com/')
      ? data.coverImage : null,
  };
}

// One bounded read per ISR regeneration; metadata and HTML share the result.
// The current publication has fewer than 200 articles. Pagination can be
// introduced if editorial inventory grows beyond this cap.
export const getArticleCatalog = cache(async (count = 200): Promise<ArticleSummary[]> => {
  const snapshot = await getDocs(query(collection(db, 'articles'), orderBy('createdAt', 'desc'), limit(count)));
  return snapshot.docs
    .filter((doc) => doc.data().status !== 'draft' && doc.data().published !== false)
    .map((doc) => toArticleSummary(doc.id, doc.data()))
    .filter((article) => article.slug && article.title.trim());
});
