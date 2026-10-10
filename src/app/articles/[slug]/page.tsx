// Server Component: article content is included in initial HTML for Google and users.
// Requires @/lib/firebase to be safe to import in a Next.js server environment.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ArticleClient from './ArticleClient';
import type { ArticleData } from './types';

// Refresh cached article HTML periodically to balance indexing and Firestore reads.
export const revalidate = 300;

type PageProps = {
  params: Promise<{ slug: string }>;
};

// React cache prevents a duplicate Firestore read when both metadata and page
// request the same article during one server render.
const getArticleBySlug = cache(async (slug: string): Promise<ArticleData | null> => {
  if (!slug) return null;

  const snapshot = await getDocs(
    query(collection(db, 'articles'), where('slug', '==', slug), limit(1))
  );

  if (snapshot.empty) return null;

  const data = snapshot.docs[0].data();
  const date = data.createdAt;
  const createdAt =
    date && typeof date.toMillis === 'function' ? date.toMillis() : null;

  return {
    title: data.title || 'Untitled',
    slug: data.slug || slug,
    category: data.category || 'Tambayan Guide',
    readTime: data.readTime || '3 min read',
    excerpt: data.excerpt || '',
    content: data.content || '',
    createdAt,
    author: data.author || 'TambayanSLU',
  };
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params; // Next.js 15 dynamic params are async.
  const article = await getArticleBySlug(slug);

  if (!article) {
    return {
      title: 'Article not found | TambayanSLU',
      robots: { index: false, follow: false },
    };
  }

  const description = (
    article.excerpt.trim() ||
    article.content.replace(/[#*_>`\[\]()]/g, '').replace(/\s+/g, ' ').trim()
  ).slice(0, 160);
  const url = `https://www.tambayanslu.com/articles/${encodeURIComponent(article.slug)}`;

  return {
    title: `${article.title} | Tambayan Reads`,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      siteName: 'TambayanSLU',
      title: article.title,
      description,
      ...(article.createdAt !== null
        ? { publishedTime: new Date(article.createdAt).toISOString() }
        : {}),
      authors: [article.author],
    },
    twitter: {
      card: 'summary',
      title: article.title,
      description,
    },
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) notFound();

  // Client Component is still pre-rendered on the server on initial requests;
  // its browser-only dark mode adjustment happens after hydration.
  return <ArticleClient article={article} />;
}
