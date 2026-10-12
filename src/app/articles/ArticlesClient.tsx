'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ARTICLE_CATEGORIES, type ArticleCategory } from './categories';
import type { ArticleSummary } from './types';

function articleDate(value: number | null) {
  return value === null ? '' : new Intl.DateTimeFormat('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila',
  }).format(value);
}

function listingHref(page: number, category: ArticleCategory | 'All Articles', search: string) {
  const params = new URLSearchParams();
  if (category !== 'All Articles') params.set('category', category);
  if (search) params.set('q', search);
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return `/articles${query ? `?${query}` : ''}`;
}

function paginationPages(page: number, totalPages: number) {
  return Array.from(new Set([1, page - 1, page, page + 1, totalPages]))
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((left, right) => left - right);
}

function ArticleCard({ article, dark }: { article: ArticleSummary; dark: boolean }) {
  return (
    <Link href={`/articles/${article.slug}`} className="group block h-full rounded-2xl focus-visible:outline-2 focus-visible:outline-emerald-600">
      <article className={`flex h-full flex-col overflow-hidden rounded-2xl border transition-colors ${dark
        ? 'border-neutral-800 bg-[#111113] hover:border-neutral-600'
        : 'border-neutral-200 bg-white hover:border-emerald-300'}`}>
        {article.coverImage && (
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-neutral-100 dark:bg-neutral-900">
            <Image src={article.coverImage} alt={`Cover photo for ${article.title}`} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" />
          </div>
        )}
        <div className="flex flex-1 flex-col p-5">
          <p className={`text-[11px] font-semibold uppercase tracking-wider ${dark ? 'text-emerald-400' : 'text-emerald-700'}`}>{article.category}</p>
          <h3 className={`mt-2 text-lg font-bold leading-snug group-hover:text-emerald-600 ${dark ? 'text-neutral-100' : 'text-neutral-900'}`}>{article.title}</h3>
          {article.excerpt && <p className={`mt-2 line-clamp-3 text-sm leading-6 ${dark ? 'text-neutral-400' : 'text-neutral-600'}`}>{article.excerpt}</p>}
          <p className="mt-auto pt-5 text-xs text-neutral-500">
            {article.createdAt !== null && <><time dateTime={new Date(article.createdAt).toISOString()}>{articleDate(article.createdAt)}</time><span aria-hidden="true"> · </span></>}
            {article.readTime}
          </p>
        </div>
      </article>
    </Link>
  );
}

type Props = {
  articles: ArticleSummary[];
  featured?: ArticleSummary;
  category: ArticleCategory | 'All Articles';
  search: string;
  page: number;
  totalPages: number;
  totalArticles: number;
};

export default function ArticlesClient({ articles, featured, category, search, page, totalPages, totalArticles }: Props) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const syncTheme = () => setDark(localStorage.getItem('unsaid_dark_mode') === 'true');
    syncTheme();
    window.addEventListener('storage', syncTheme);
    return () => window.removeEventListener('storage', syncTheme);
  }, []);

  const pages = paginationPages(page, totalPages);

  return (
    <div className={`min-h-screen ${dark ? 'bg-[#09090b] text-neutral-100' : 'bg-[#fafafa] text-neutral-900'}`}>
      <header className={`sticky top-0 z-50 border-b backdrop-blur-xl ${dark ? 'border-neutral-800 bg-[#09090b]/90' : 'border-neutral-200 bg-white/90'}`}>
        <nav aria-label="Article navigation" className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6">
          <Link href="/" className={`text-sm font-medium ${dark ? 'text-neutral-300' : 'text-neutral-600'}`}>← Tambayan</Link>
          <Link href="/" className="text-lg font-black tracking-tight">Tambayan<span className="text-emerald-600">.</span></Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-24 pt-10 sm:px-6 sm:pt-14">
        <div className="mb-9 max-w-2xl">
          <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${dark ? 'text-emerald-400' : 'text-emerald-700'}`}>A Louisian publication</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Tambayan Reads</h1>
          <p className={`mt-3 text-sm leading-7 sm:text-base ${dark ? 'text-neutral-400' : 'text-neutral-600'}`}>Stories, guides, and everything in between. A little something for every Louisian.</p>
        </div>

        {featured && (
          <section aria-label="Featured reading" className="mb-10">
            <Link href={`/articles/${featured.slug}`} className={`group grid overflow-hidden rounded-2xl border focus-visible:outline-2 focus-visible:outline-emerald-600 ${dark ? 'border-neutral-800 bg-[#111113] hover:border-neutral-600' : 'border-neutral-200 bg-white hover:border-emerald-300'} ${featured.coverImage ? 'md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]' : ''}`}>
              <div className="flex flex-col justify-center p-6 sm:p-8">
                <p className={`text-[11px] font-semibold uppercase tracking-wider ${dark ? 'text-emerald-400' : 'text-emerald-700'}`}>Featured · {featured.category}</p>
                <h2 className="mt-3 text-2xl font-bold leading-tight tracking-tight sm:text-3xl group-hover:text-emerald-600">{featured.title}</h2>
                {featured.excerpt && <p className={`mt-3 line-clamp-3 text-sm leading-6 ${dark ? 'text-neutral-400' : 'text-neutral-600'}`}>{featured.excerpt}</p>}
                <p className="mt-5 text-xs text-neutral-500">
                  {featured.createdAt !== null && <><time dateTime={new Date(featured.createdAt).toISOString()}>{articleDate(featured.createdAt)}</time><span aria-hidden="true"> · </span></>}
                  {featured.readTime}
                </p>
              </div>
              {featured.coverImage && <div className="relative min-h-48 bg-neutral-100 dark:bg-neutral-900"><Image src={featured.coverImage} alt={`Cover photo for ${featured.title}`} fill sizes="(max-width: 768px) 100vw, 40vw" className="object-cover" priority /></div>}
            </Link>
          </section>
        )}

        <section aria-label="Find articles">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-xl font-bold tracking-tight">Browse articles</h2>
            <form action="/articles" method="get" className="flex w-full gap-2 sm:w-auto">
              {category !== 'All Articles' && <input type="hidden" name="category" value={category} />}
              <label className="min-w-0 flex-1 sm:w-72">
                <span className="sr-only">Search articles</span>
                <input type="search" name="q" defaultValue={search} placeholder="Search stories and guides" className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:border-emerald-600 ${dark ? 'border-neutral-700 bg-[#111113] text-white placeholder:text-neutral-500' : 'border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-500'}`} />
              </label>
              <button type="submit" className={`rounded-xl border px-4 py-2.5 text-sm font-semibold ${dark ? 'border-neutral-700 hover:bg-neutral-900' : 'border-neutral-200 bg-white hover:bg-neutral-100'}`}>Search</button>
            </form>
          </div>
          <div role="group" aria-label="Article categories" className="-mx-5 mb-7 flex gap-2 overflow-x-auto px-5 pb-2 sm:mx-0 sm:px-0">
            {(['All Articles', ...ARTICLE_CATEGORIES] as const).map((option) => (
              <Link key={option} href={listingHref(1, option, search)} aria-current={category === option ? 'page' : undefined}
                className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600 ${category === option
                  ? 'border-emerald-700 bg-emerald-700 text-white'
                  : dark ? 'border-neutral-700 bg-[#111113] text-neutral-300 hover:border-neutral-500' : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400'}`}>
                {option}
              </Link>
            ))}
          </div>

          {articles.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{articles.map((article) => <ArticleCard key={article.id} article={article} dark={dark} />)}</div>
          ) : (
            <div className={`rounded-2xl border px-6 py-12 text-center text-sm ${dark ? 'border-neutral-800 text-neutral-400' : 'border-neutral-200 text-neutral-600'}`}>
              {totalArticles === 0 ? 'No articles yet. Check back soon.' : 'No stories match this search. Try another category or keyword.'}
            </div>
          )}

          {totalPages > 1 && (
            <nav aria-label="Article pages" className="mt-9 flex flex-wrap items-center justify-center gap-2">
              {page > 1 && <Link rel="prev" href={listingHref(page - 1, category, search)} className={`rounded-lg border px-4 py-2 text-sm font-semibold ${dark ? 'border-neutral-700' : 'border-neutral-200 bg-white'}`}>Previous</Link>}
              {pages.map((pageNumber, index) => <span key={pageNumber} className="contents">
                {index > 0 && pageNumber - pages[index - 1] > 1 && <span className="px-1 text-neutral-500" aria-hidden="true">…</span>}
                <Link href={listingHref(pageNumber, category, search)} aria-current={pageNumber === page ? 'page' : undefined}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold ${pageNumber === page ? 'border-emerald-700 bg-emerald-700 text-white' : dark ? 'border-neutral-700' : 'border-neutral-200 bg-white'}`}>{pageNumber}</Link>
              </span>)}
              {page < totalPages && <Link rel="next" href={listingHref(page + 1, category, search)} className={`rounded-lg border px-4 py-2 text-sm font-semibold ${dark ? 'border-neutral-700' : 'border-neutral-200 bg-white'}`}>Next</Link>}
            </nav>
          )}
        </section>

        <aside className={`mt-14 border-t pt-6 text-sm leading-6 ${dark ? 'border-neutral-800 text-neutral-500' : 'border-neutral-200 text-neutral-600'}`}>Tambayan Reads is made for students. TambayanSLU is independent of Saint Louis University.</aside>
      </main>
    </div>
  );
}
