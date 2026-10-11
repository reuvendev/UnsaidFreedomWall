/** Plain serializable data sent from the Server Component to the Client Component. */
import type { ArticleCategory } from '../categories';
export interface ArticleData {
  title: string;
  slug: string;
  category: ArticleCategory;
  readTime: string;
  excerpt: string;
  content: string;
  createdAt: number | null; // Epoch milliseconds, not Firestore Timestamp
  updatedAt: number | null;
  author: string;
  tags: string[];
  coverImage: string | null;
}
