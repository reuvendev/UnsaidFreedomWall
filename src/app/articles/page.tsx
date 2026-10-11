import type { Metadata } from 'next';
import ArticlesClient from './ArticlesClient';
import { getArticleCatalog } from './article-data';

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const articles = await getArticleCatalog();
  return {
    title: 'Tambayan Reads | TambayanSLU',
    description: 'Stories, guides, and everything in between. A little something for every Louisian.',
    alternates: { canonical: '/articles' },
    ...(!articles.some((article) => article.slug !== 'test')
      ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title: 'Tambayan Reads | TambayanSLU',
      description: 'Stories and guides from the Tambayan community.',
      url: 'https://www.tambayanslu.com/articles',
      type: 'website',
    },
  };
}

export default async function ArticlesIndexPage() {
  const articles = await getArticleCatalog();
  return <ArticlesClient initialArticles={articles} />;
}
