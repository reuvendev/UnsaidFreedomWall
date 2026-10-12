/** Serializable article summary passed from the server to the client. */
import type { ArticleCategory } from './categories';
export interface ArticleSummary {
  id: string;
  title: string;
  slug: string;
  category: ArticleCategory;
  readTime: string;
  excerpt: string;
  createdAt: number | null; // Epoch milliseconds, never a Firestore Timestamp
  updatedAt: number | null;
  author: string;
  featured: boolean;
  tags: string[];
  coverImage: string | null;
}
