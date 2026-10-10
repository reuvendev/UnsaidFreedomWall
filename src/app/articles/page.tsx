// Server Component: its first 10 articles are included in the HTML response.
// Important: this requires @/lib/firebase to be safe to import on the server.
import type { Metadata } from 'next';
import { collection, getDocs, limit, orderBy, query, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ArticlesClient from './ArticlesClient';
import type { ArticleSummary } from './types';

const PAGE_SIZE = 10;

// Refresh the page cache periodically instead of reading Firestore on every visit.
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Tambayan Reads | TambayanSLU',
  description:
    'Read original student stories, practical guides, and community updates from TambayanSLU.',
  alternates: { canonical: 'https://www.tambayanslu.com/articles' },
  openGraph: {
    title: 'Tambayan Reads | TambayanSLU',
    description:
      'Student stories, practical guides, and community updates from the Tambayan.',
    url: 'https://www.tambayanslu.com/articles',
    type: 'website'
  }
};

export default async function ArticlesIndexPage() {
  // Retains your original Firestore ordering and 10-article batch size.
  // The read happens on the server, before HTML is sent to browsers/crawlers.
  const snapshot = await getDocs(
    query(collection(db, 'articles'), orderBy('createdAt', 'desc'), limit(PAGE_SIZE))
  );

  const initialArticles: ArticleSummary[] = snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      title: data.title || 'Untitled',
      slug: data.slug || '#',
      category: data.category || 'Tambayan Guide',
      readTime: data.readTime || '3 min read',
      excerpt: data.excerpt || '',
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : null,
      author: data.author || 'TambayanSLU'
    };
  });

  return (
    <ArticlesClient
      initialArticles={initialArticles}
      initialLastDocId={snapshot.docs[snapshot.docs.length - 1]?.id ?? null}
      initialHasMore={snapshot.size === PAGE_SIZE}
    />
  );
}
