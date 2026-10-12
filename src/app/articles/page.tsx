import type { Metadata } from 'next';
import ArticlesClient from './ArticlesClient';
import { filterArticles, isArticleCategory, type ArticleCategory } from './categories';
import { getArticleCatalog, paginateArticles } from './article-data';

export const revalidate = 300;

type SearchParams = { page?: string | string[]; category?: string | string[]; q?: string | string[] };
type PageProps = { searchParams?: SearchParams | Promise<SearchParams> };

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

async function listingState(searchParams: PageProps['searchParams']) {
  const params = await searchParams;
  const categoryValue = first(params?.category);
  const category: ArticleCategory | 'All Articles' = isArticleCategory(categoryValue)
    ? categoryValue : 'All Articles';
  const search = first(params?.q).trim().slice(0, 100);
  const requestedPage = Math.max(1, Number.parseInt(first(params?.page), 10) || 1);
  return { category, search, requestedPage };
}

function listingCanonical(page: number, category: ArticleCategory | 'All Articles') {
  const params = new URLSearchParams();
  if (category !== 'All Articles') params.set('category', category);
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return `/articles${query ? `?${query}` : ''}`;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const articles = await getArticleCatalog();
  const { category, search, requestedPage } = await listingState(searchParams);
  const featured = articles.find((article) => article.featured) || articles[0];
  const useFeaturedCatalog = category === 'All Articles' && !search && Boolean(featured);
  const filtered = filterArticles(articles, category, search, useFeaturedCatalog ? featured?.id : undefined);
  const { page } = paginateArticles(filtered, requestedPage);
  const title = page > 1 ? `Tambayan Reads - Page ${page} | TambayanSLU` : 'Tambayan Reads | TambayanSLU';
  return {
    title,
    description: 'Stories, guides, and everything in between. A little something for every Louisian.',
    alternates: { canonical: listingCanonical(page, category) },
    ...(!articles.length || (!filtered.length && !useFeaturedCatalog) || search
      ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title,
      description: 'Stories and guides from the Tambayan community.',
      url: `https://www.tambayanslu.com${listingCanonical(page, category)}`,
      type: 'website',
    },
  };
}

export default async function ArticlesIndexPage({ searchParams }: PageProps) {
  const articles = await getArticleCatalog();
  const { category, search, requestedPage } = await listingState(searchParams);
  const featured = articles.find((article) => article.featured) || articles[0];
  const useFeaturedCatalog = category === 'All Articles' && !search && Boolean(featured);
  const filtered = filterArticles(articles, category, search, useFeaturedCatalog ? featured?.id : undefined);
  const pagination = paginateArticles(filtered, requestedPage);
  const showFeatured = pagination.page === 1 && useFeaturedCatalog;

  return <ArticlesClient
    articles={pagination.articles}
    featured={showFeatured ? featured : undefined}
    category={category}
    search={search}
    page={pagination.page}
    totalPages={pagination.totalPages}
    totalArticles={articles.length}
  />;
}
