// Server Component: article content is included in initial HTML for Google and users.
// Public reads use the server-only Admin SDK repository.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ArticleClient from './ArticleClient';
import { selectRelatedArticles } from '../categories';
import { getArticleBySlug, getArticleCatalog } from '../article-data';

// Refresh cached article HTML periodically to balance indexing and Firestore reads.
export const revalidate = 300;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params; // Next.js 15 dynamic params are async.
  const article = await getArticleBySlug(slug);

  if (!article) {
    return {
      title: 'Article not found | TambayanSLU',
      robots: { index: false, follow: false },
    };
  }

  const editorialReviewNeeded = slug.toLowerCase() === 'test';

  const description = (
    article.excerpt.trim() ||
    article.content.replace(/[#*_>`\[\]()]/g, '').replace(/\s+/g, ' ').trim()
  ).slice(0, 160);
  const url = `https://www.tambayanslu.com/articles/${encodeURIComponent(article.slug)}`;

  return {
    title: `${article.title} | Tambayan Reads`,
    ...(editorialReviewNeeded ? { robots: { index: false, follow: false } } : {}),
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      siteName: 'TambayanSLU',
      title: article.title,
      description,
      ...(article.coverImage ? { images: [{ url: article.coverImage, alt: `Cover photo for ${article.title}` }] } : {}),
      ...(article.createdAt !== null
        ? { publishedTime: new Date(article.createdAt).toISOString() }
        : {}),
      ...(article.updatedAt !== null
        ? { modifiedTime: new Date(article.updatedAt).toISOString() }
        : {}),
      authors: [article.author],
    },
    twitter: {
      card: 'summary',
      title: article.title,
      description,
      ...(article.coverImage ? { images: [article.coverImage] } : {}),
    },
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) notFound();

  // A single small, cached catalog page supplies related links without a
  // category-specific listener or Firestore composite index.
  let candidates: Awaited<ReturnType<typeof getArticleCatalog>> = [];
  try {
    candidates = (await getArticleCatalog()).filter((candidate) => candidate.slug !== article.slug);
  } catch (error) {
    // Suggestions must never prevent an otherwise available article from loading.
    console.error('Could not load related reading:', error);
  }
  const related = selectRelatedArticles(candidates, article.slug, article.category, 3);

  // Client Component is still pre-rendered on the server on initial requests;
  // its browser-only dark mode adjustment happens after hydration.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    articleSection: article.category,
    ...(article.tags.length ? { keywords: article.tags.join(', ') } : {}),
    description: article.excerpt || undefined,
    mainEntityOfPage: `https://www.tambayanslu.com/articles/${encodeURIComponent(article.slug)}`,
    author: { '@type': article.author === 'TambayanSLU' ? 'Organization' : 'Person', name: article.author },
    publisher: { '@type': 'Organization', name: 'Valiance' },
    ...(article.createdAt !== null ? { datePublished: new Date(article.createdAt).toISOString() } : {}),
    ...(article.updatedAt !== null ? { dateModified: new Date(article.updatedAt).toISOString() } : {}),
    ...(article.coverImage ? { image: article.coverImage } : {}),
  };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
    <ArticleClient article={article} related={related} />
  </>;
}
