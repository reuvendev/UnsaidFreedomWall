'use server';

import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath, revalidateTag, unstable_noStore } from 'next/cache';
import { adminDb } from '@/lib/team/firebase-admin';
import { requireAdminAuth } from '@/app/admin/actions';
import { isArticleCategory, resolveArticleCategory, type ArticleCategory } from '@/app/articles/categories';
import {
  ARTICLE_CACHE_TAG,
  ARTICLES_PAGE_SIZE,
  buildPublishedArticleCatalog,
  isIndexableArticleSlug,
  isPublishedArticleData,
  isPublicArticleData,
  paginateArticles,
  readAllArticleDocuments,
  toArticleSummary,
} from '@/app/articles/article-data';
import { verifyArticleCover } from '@/lib/r2';

type ArticleMetadata = { id: string; title: string; slug: string; category: ArticleCategory; featured: boolean; tags: string[]; coverImage: string | null };

function cleanTags(input: unknown): string[] {
  return Array.isArray(input) ? Array.from(new Set(input.filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => tag.trim()).filter(Boolean).map((tag) => tag.slice(0, 40)))).slice(0, 8) : [];
}

function refreshArticlePages(slug: string) {
  revalidateTag(ARTICLE_CACHE_TAG);
  revalidatePath('/articles');
  revalidatePath('/articles/[slug]', 'page');
  if (slug) revalidatePath(`/articles/${slug}`);
  revalidatePath('/sitemap.xml');
}

export async function listArticleMetadata(): Promise<ArticleMetadata[]> {
  await requireAdminAuth();
  unstable_noStore();
  const documents = await readAllArticleDocuments();
  return documents.filter((document) => isPublishedArticleData(document.data())).map((document) => {
    const article = toArticleSummary(document.id, document.data());
    return {
      id: article.id,
      title: article.title,
      slug: article.slug,
      category: resolveArticleCategory(document.data().category, article.slug),
      featured: article.featured,
      tags: article.tags,
      coverImage: article.coverImage,
    };
  }).sort((left, right) => left.title.localeCompare(right.title));
}

export async function checkArticleSlugAvailability(slugInput: string): Promise<boolean> {
  await requireAdminAuth();
  unstable_noStore();
  const slug = slugInput.trim();
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return false;
  const snapshot = await adminDb().collection('articles').where('slug', '==', slug).limit(1).get();
  return snapshot.empty;
}

export async function publishArticle(input: {
  title: string; slug: string; excerpt: string; content: string; author: string;
  category: string; featured: boolean; tags: string[]; coverImage?: string;
}): Promise<{ success: boolean; error?: string }> {
  await requireAdminAuth();
  const title = input.title?.trim();
  const slug = input.slug?.trim();
  const excerpt = input.excerpt?.trim();
  const content = input.content?.trim();
  if (!title || !slug || !excerpt || !content || title.length > 180 || excerpt.length > 220 || content.length > 40000
    || !/^[a-z0-9-]{1,120}$/.test(slug) || !isArticleCategory(input.category)) {
    return { success: false, error: 'Check the title, URL, description, body, and category.' };
  }
  const coverImage = input.coverImage?.trim() || '';
  if (coverImage && !(await verifyArticleCover(coverImage))) {
    return { success: false, error: 'Upload a valid article cover before publishing.' };
  }
  const db = adminDb();
  if (!(await db.collection('articles').where('slug', '==', slug).limit(1).get()).empty) {
    return { success: false, error: 'This article URL is already in use.' };
  }
  try {
    await db.collection('articles').doc(slug).create({
      title, slug, excerpt, content,
      category: input.category,
      featured: input.featured === true,
      tags: cleanTags(input.tags),
      ...(coverImage ? { coverImage } : {}),
      readTime: `${Math.max(1, Math.ceil(content.split(/\s+/).length / 220))} min read`,
      author: input.author?.trim().slice(0, 100) || 'TambayanSLU',
      status: 'published',
      published: true,
      publishedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    if ((error as { code?: number | string }).code === 6 || (error as { code?: number | string }).code === 'already-exists') {
      return { success: false, error: 'This article URL is already in use.' };
    }
    throw error;
  }
  refreshArticlePages(slug);
  return { success: true };
}

export async function updateArticleMetadata(input: {
  id: string; category: string; featured: boolean; tags: string[]; coverImage?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  await requireAdminAuth();
  if (!input.id || input.id.length > 200 || input.id.includes('/') || !isArticleCategory(input.category)) {
    return { success: false, error: 'Choose an article and a valid category.' };
  }
  const ref = adminDb().collection('articles').doc(input.id);
  const existing = await ref.get();
  if (!existing.exists || !isPublicArticleData(existing.data()!)) {
    return { success: false, error: 'Published article not found.' };
  }
  const currentCover = typeof existing.data()?.coverImage === 'string' ? existing.data()!.coverImage : null;
  if (input.coverImage && input.coverImage !== currentCover && !(await verifyArticleCover(input.coverImage))) {
    return { success: false, error: 'Upload a valid article cover before saving.' };
  }
  await ref.update({
    category: input.category,
    featured: input.featured === true,
    tags: cleanTags(input.tags),
    ...(input.coverImage !== undefined ? { coverImage: input.coverImage || FieldValue.delete() } : {}),
    updatedAt: FieldValue.serverTimestamp(),
  });
  refreshArticlePages(String(existing.data()?.slug || ''));
  return { success: true };
}

export async function unpublishArticle(id: string): Promise<{ success: boolean; error?: string }> {
  await requireAdminAuth();
  if (!id || id.length > 200 || id.includes('/')) return { success: false, error: 'Invalid article.' };
  const ref = adminDb().collection('articles').doc(id);
  const existing = await ref.get();
  if (!existing.exists || !isPublishedArticleData(existing.data()!)) {
    return { success: false, error: 'Published article not found.' };
  }
  const slugValue = existing.data()?.slug;
  const slug = typeof slugValue === 'string' ? slugValue : '';
  const matchingRefs = new Map([[ref.path, ref]]);
  if (slug) {
    const duplicates = await adminDb().collection('articles').where('slug', '==', slug).get();
    for (const document of duplicates.docs.filter((item) => isPublishedArticleData(item.data()))) {
      matchingRefs.set(document.ref.path, document.ref);
    }
  }
  const refs = Array.from(matchingRefs.values());
  for (let offset = 0; offset < refs.length; offset += 500) {
    const batch = adminDb().batch();
    for (const articleRef of refs.slice(offset, offset + 500)) {
      batch.update(articleRef, { status: 'unpublished', published: false, updatedAt: FieldValue.serverTimestamp() });
    }
    await batch.commit();
  }
  refreshArticlePages(slug);
  return { success: true };
}

export type ArticleConsistencyResult = {
  firestorePublishedArticles: number;
  accessibleListingArticles: number;
  sitemapArticleUrls: number;
  missingFromListings: string[];
  missingFromSitemap: string[];
  unexpectedListings: string[];
  unexpectedSitemap: string[];
  duplicateSlugs: string[];
};

export async function runArticleConsistencyCheck(): Promise<ArticleConsistencyResult> {
  await requireAdminAuth();
  unstable_noStore();
  const documents = await readAllArticleDocuments();
  const published = documents.filter((document) => isPublishedArticleData(document.data()));
  const catalog = buildPublishedArticleCatalog(documents);

  const listingIds = new Set<string>();
  const totalPages = Math.max(1, Math.ceil(catalog.length / ARTICLES_PAGE_SIZE));
  for (let page = 1; page <= totalPages; page += 1) {
    for (const article of paginateArticles(catalog, page).articles) listingIds.add(article.id);
  }

  const sitemapArticles = catalog.filter((article) => isIndexableArticleSlug(article.slug));
  const sitemapIds = new Set(sitemapArticles.map((article) => article.id));
  const sitemapUrls = new Set(sitemapArticles.map((article) =>
    `https://www.tambayanslu.com/articles/${encodeURIComponent(article.slug)}`));
  const publishedIds = new Set(published.map((document) => document.id));
  const slugOwners = new Map<string, string[]>();
  for (const document of published) {
    const slug = typeof document.data().slug === 'string' ? document.data().slug : '';
    if (!slug) continue;
    slugOwners.set(slug, [...(slugOwners.get(slug) || []), document.id]);
  }
  const difference = (left: Set<string>, right: Set<string>) => Array.from(left).filter((id) => !right.has(id)).sort();

  return {
    firestorePublishedArticles: publishedIds.size,
    accessibleListingArticles: listingIds.size,
    sitemapArticleUrls: sitemapUrls.size,
    missingFromListings: difference(publishedIds, listingIds),
    missingFromSitemap: difference(publishedIds, sitemapIds),
    unexpectedListings: difference(listingIds, publishedIds),
    unexpectedSitemap: difference(sitemapIds, publishedIds),
    duplicateSlugs: Array.from(slugOwners.entries()).filter(([, ids]) => ids.length > 1).map(([slug]) => slug).sort(),
  };
}
