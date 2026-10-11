'use server';

import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { adminDb } from '@/lib/team/firebase-admin';
import { requireAdminAuth } from '@/app/admin/actions';
import { isArticleCategory, resolveArticleCategory, type ArticleCategory } from '@/app/articles/categories';
import { verifyArticleCover } from '@/lib/r2';

type ArticleMetadata = { id: string; title: string; slug: string; category: ArticleCategory; featured: boolean; tags: string[]; coverImage: string | null };

function cleanTags(input: unknown): string[] {
  return Array.isArray(input) ? Array.from(new Set(input.filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => tag.trim()).filter(Boolean).map((tag) => tag.slice(0, 40)))).slice(0, 8) : [];
}

function refreshArticlePages(slug: string) {
  revalidatePath('/articles');
  revalidatePath(`/articles/${slug}`);
  revalidatePath('/sitemap.xml');
}

export async function listArticleMetadata(): Promise<ArticleMetadata[]> {
  await requireAdminAuth();
  const snapshot = await adminDb().collection('articles').orderBy('createdAt', 'desc').limit(100).get();
  return snapshot.docs.filter((doc) => doc.data().status !== 'draft' && doc.data().published !== false).map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      title: String(data.title || 'Untitled'),
      slug: String(data.slug || ''),
      category: resolveArticleCategory(data.category, String(data.slug || '')),
      featured: data.featured === true,
      tags: cleanTags(data.tags),
      coverImage: typeof data.coverImage === 'string' && data.coverImage.startsWith('https://cdn.tambayanslu.com/')
        ? data.coverImage : null,
    };
  });
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
  await db.collection('articles').add({
    title, slug, excerpt, content,
    category: input.category,
    featured: input.featured === true,
    tags: cleanTags(input.tags),
    ...(coverImage ? { coverImage } : {}),
    readTime: `${Math.max(1, Math.ceil(content.split(/\s+/).length / 220))} min read`,
    author: input.author?.trim().slice(0, 100) || 'TambayanSLU',
    createdAt: FieldValue.serverTimestamp(),
  });
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
  if (!existing.exists || existing.data()?.status === 'draft' || existing.data()?.published === false) {
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
