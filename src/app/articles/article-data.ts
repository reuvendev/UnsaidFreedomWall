import 'server-only';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { FieldPath, type DocumentData, type QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/team/firebase-admin';
import { articleTags, resolveArticleCategory } from './categories';
import type { ArticleSummary } from './types';
import type { ArticleData } from './[slug]/types';

export const ARTICLE_CACHE_TAG = 'articles:list';
export const ARTICLES_PAGE_SIZE = 12;
const FIRESTORE_BATCH_SIZE = 100;
const VALID_SLUG = /^[a-z0-9-]{1,120}$/i;

function millis(value: unknown): number | null {
  return value && typeof (value as { toMillis?: () => number }).toMillis === 'function'
    ? (value as { toMillis: () => number }).toMillis() : null;
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function isPublishedArticleData(data: DocumentData): boolean {
  if (data.published === false) return false;
  if (data.status === undefined || data.status === null || data.status === '') return true;
  return data.status === 'published';
}

export function isIndexableArticleSlug(slug: string): boolean {
  return VALID_SLUG.test(slug) && slug.toLowerCase() !== 'test';
}

export function isValidArticleSlug(slug: string): boolean {
  return VALID_SLUG.test(slug);
}

export function isPublicArticleData(data: DocumentData): boolean {
  const slug = stringValue(data.slug).trim();
  return isPublishedArticleData(data) && isValidArticleSlug(slug) &&
    stringValue(data.title).trim().length > 0 && stringValue(data.content).trim().length > 0;
}

export function toArticleSummary(id: string, data: DocumentData): ArticleSummary {
  const slug = stringValue(data.slug).trim();
  const publishedAt = millis(data.publishedAt) ?? millis(data.createdAt);
  return {
    id,
    slug,
    title: stringValue(data.title, 'Untitled'),
    category: resolveArticleCategory(data.category, slug),
    readTime: stringValue(data.readTime, '3 min read'),
    excerpt: stringValue(data.excerpt),
    createdAt: publishedAt,
    updatedAt: millis(data.updatedAt),
    author: stringValue(data.author, 'TambayanSLU'),
    featured: data.featured === true,
    tags: articleTags(data.tags),
    coverImage: typeof data.coverImage === 'string' && data.coverImage.startsWith('https://cdn.tambayanslu.com/')
      ? data.coverImage : null,
  };
}

function toArticleData(data: DocumentData, fallbackSlug: string): ArticleData {
  const slug = stringValue(data.slug, fallbackSlug).trim();
  return {
    title: stringValue(data.title, 'Untitled'),
    slug,
    category: resolveArticleCategory(data.category, slug),
    readTime: stringValue(data.readTime, '3 min read'),
    excerpt: stringValue(data.excerpt),
    content: stringValue(data.content),
    createdAt: millis(data.publishedAt) ?? millis(data.createdAt),
    updatedAt: millis(data.updatedAt),
    author: stringValue(data.author, 'TambayanSLU'),
    tags: articleTags(data.tags),
    coverImage: typeof data.coverImage === 'string' && data.coverImage.startsWith('https://cdn.tambayanslu.com/')
      ? data.coverImage : null,
  };
}

export async function readAllArticleDocuments(): Promise<QueryDocumentSnapshot[]> {
  const documents: QueryDocumentSnapshot[] = [];
  let cursor: QueryDocumentSnapshot | undefined;

  do {
    let query = adminDb().collection('articles')
      .orderBy(FieldPath.documentId())
      .limit(FIRESTORE_BATCH_SIZE);
    if (cursor) query = query.startAfter(cursor);
    const snapshot = await query.get();
    documents.push(...snapshot.docs);
    cursor = snapshot.docs.at(-1);
    if (snapshot.size < FIRESTORE_BATCH_SIZE) break;
  } while (cursor);

  return documents;
}

export function buildPublishedArticleCatalog(documents: QueryDocumentSnapshot[]): ArticleSummary[] {
  const articles = documents
    .filter((document) => isPublicArticleData(document.data()))
    .map((document) => toArticleSummary(document.id, document.data()))
    .filter((article) => isIndexableArticleSlug(article.slug) && article.title.trim())
    .sort((left, right) =>
      (right.createdAt ?? 0) - (left.createdAt ?? 0) || right.id.localeCompare(left.id));
  const seenSlugs = new Set<string>();
  return articles.filter((article) => {
    if (seenSlugs.has(article.slug)) return false;
    seenSlugs.add(article.slug);
    return true;
  });
}

export async function loadPublishedArticleCatalog(): Promise<ArticleSummary[]> {
  return buildPublishedArticleCatalog(await readAllArticleDocuments());
}

const getCachedArticleCatalog = unstable_cache(
  loadPublishedArticleCatalog,
  ['published-article-catalog-v2'],
  { revalidate: 300, tags: [ARTICLE_CACHE_TAG] }
);

export const getArticleCatalog = cache(getCachedArticleCatalog);

export const getArticleBySlug = cache(async (slug: string): Promise<ArticleData | null> => {
  if (!isValidArticleSlug(slug)) return null;
  const snapshot = await adminDb().collection('articles').where('slug', '==', slug).limit(20).get();
  const published = snapshot.docs
    .filter((document) => isPublicArticleData(document.data()))
    .sort((left, right) => {
      const leftDate = millis(left.data().publishedAt) ?? millis(left.data().createdAt) ?? 0;
      const rightDate = millis(right.data().publishedAt) ?? millis(right.data().createdAt) ?? 0;
      return rightDate - leftDate || right.id.localeCompare(left.id);
    });
  return published[0] ? toArticleData(published[0].data(), slug) : null;
});

export function paginateArticles(articles: ArticleSummary[], requestedPage: number) {
  const totalPages = Math.max(1, Math.ceil(articles.length / ARTICLES_PAGE_SIZE));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const start = (page - 1) * ARTICLES_PAGE_SIZE;
  return { page, totalPages, articles: articles.slice(start, start + ARTICLES_PAGE_SIZE) };
}
