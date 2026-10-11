import type { ArticleSummary } from './types';

export const ARTICLE_CATEGORIES = [
  'Campus Life',
  'Student Guides',
  'College Stories',
  'Student Wellness',
  'Digital Life & Safety',
  'Inside Tambayan',
] as const;

export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number];

export function isArticleCategory(value: unknown): value is ArticleCategory {
  return typeof value === 'string' && ARTICLE_CATEGORIES.some((category) => category === value);
}

// These published stories were reviewed by subject, not inferred from a keyword
// in a title. Explicit category fields added by editors take precedence.
const LEGACY_ARTICLE_CATEGORIES: Record<string, ArticleCategory> = {
  'how-to-speak-up-about-campus-problems-without-exposing-anyone': 'Digital Life & Safety',
  'the-friends-you-meet-in-college': 'College Stories',
  'why-tambayanslu-still-has-rules': 'Inside Tambayan',
  'this-week-in-rants-groupmates-deadlines-and-pagod-na-ako': 'Campus Life',
  'this-week-in-love-crushes-what-ifs-and-people-we-still-miss': 'College Stories',
  'a-week-of-grades-crushes-and-miss-ko-na-siya': 'Campus Life',
  'how-to-use-tambayanslu-responsibly': 'Digital Life & Safety',
  'why-tambayanslu-exists': 'Inside Tambayan',
};

export function resolveArticleCategory(category: unknown, slug: string): ArticleCategory {
  if (isArticleCategory(category)) return category;
  if (LEGACY_ARTICLE_CATEGORIES[slug]) return LEGACY_ARTICLE_CATEGORIES[slug];
  switch (typeof category === 'string' ? category.toLowerCase() : '') {
    case 'guide': return 'Student Guides';
    case 'student life':
    case 'baguio': return 'Campus Life';
    case 'online safety': return 'Digital Life & Safety';
    case 'tambayan':
    case 'update':
    case 'announcement': return 'Inside Tambayan';
    default: return 'Campus Life';
  }
}

export function articleTags(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((tag): tag is string =>
    typeof tag === 'string' && tag.trim().length > 0).slice(0, 8) : [];
}

export function filterArticles(articles: ArticleSummary[], category: ArticleCategory | 'All Articles', search: string, excludedId?: string) {
  const term = search.trim().toLocaleLowerCase();
  return articles.filter((article) =>
    article.id !== excludedId &&
    (category === 'All Articles' || article.category === category) &&
    (!term || [article.title, article.excerpt, ...article.tags]
      .some((text) => text.toLocaleLowerCase().includes(term)))
  );
}

export function selectRelatedArticles(articles: ArticleSummary[], currentSlug: string, category: ArticleCategory, count = 3) {
  return articles.filter((article) => article.slug !== currentSlug)
    .sort((a, b) => Number(b.category === category) - Number(a.category === category))
    .slice(0, count);
}
