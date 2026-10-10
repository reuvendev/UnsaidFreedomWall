/** Plain serializable data sent from the Server Component to the Client Component. */
export interface ArticleData {
  title: string;
  slug: string;
  category: string;
  readTime: string;
  excerpt: string;
  content: string;
  createdAt: number | null; // Epoch milliseconds, not Firestore Timestamp
  author: string;
}
