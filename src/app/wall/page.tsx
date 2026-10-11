// Server Component — published entries are part of the INITIAL HTML.
// Keep the real-time listeners and interactions inside WallClient.tsx.
import type { Metadata } from 'next';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import WallClient from './WallClient';
import { mapPublicWallPost } from './post-types';
import type { PostProps } from './post-types';

// Moderation removals must not remain visible in a cached HTML response.
// Only ten recent posts are read; pinned posts arrive through the existing live listener.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Freedom Wall | TambayanSLU',
  description: 'Read anonymous, moderated student thoughts, advice, and stories on the TambayanSLU Freedom Wall.',
  alternates: { canonical: '/wall' },
  openGraph: {
    title: 'Freedom Wall | TambayanSLU',
    description: 'Explore anonymous, moderated conversations from the Tambayan community.',
    url: 'https://www.tambayanslu.com/wall',
    type: 'website',
  },
};

async function queryPublicWall(): Promise<{
  posts: PostProps[];
  pinnedPosts: PostProps[];
}> {
  // Copy the existing client-side moderation condition exactly.
  const postsRef = collection(db, 'posts');
  const regular = await getDocs(query(
      postsRef,
      where('status', '==', 'approved'),
      orderBy('createdAt', 'desc'),
      limit(10)
    ));

  return {
    posts: regular.docs.filter((d) => d.data().status === 'approved')
      .map((d) => mapPublicWallPost(d.id, d.data())),
    pinnedPosts: [],
  };
}

export default async function WallPage() {
  const { posts, pinnedPosts } = await queryPublicWall();
  return <WallClient initialPosts={posts} initialPinnedPosts={pinnedPosts} />;
}
