/** Serializable article summary passed from the server to the client. */
export interface ArticleSummary {
  id: string;
  title: string;
  slug: string;
  category: string;
  readTime: string;
  excerpt: string;
  createdAt: number | null; // Epoch milliseconds, never a Firestore Timestamp
  author: string;
}
