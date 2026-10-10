// Server Component — published entries are part of the INITIAL HTML.
// Keep the real-time listeners and interactions inside WallClient.tsx.
import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import WallClient from './WallClient';
import { mapPublicWallPost } from './post-types';
import type { PostProps } from './post-types';

// Always render on the server (not a build-time static shell).
// Cache the SERIALIZED PUBLIC post data to avoid one Firestore request per visitor.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Freedom Wall | TambayanSLU',
  description: 'Read anonymous, moderated student thoughts, advice, and stories on the TambayanSLU Freedom Wall.',
  alternates: { canonical: 'https://www.tambayanslu.com/wall' },
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
  const [regular, pinned] = await Promise.all([
    getDocs(query(
      postsRef,
      where('status', '==', 'approved'),
      orderBy('createdAt', 'desc'),
      limit(10)
    )),
    getDocs(query(
      postsRef,
      where('status', '==', 'approved'),
      where('isPinned', '==', true),
      orderBy('createdAt', 'desc'),
      limit(20)
    )),
  ]);

  return {
    posts: regular.docs.map((d) => mapPublicWallPost(d.id, d.data())),
    pinnedPosts: pinned.docs.map((d) => mapPublicWallPost(d.id, d.data())),
  };
}

// Short TTL because this is moderated user-generated content.
// Note: Firebase real-time listeners still update the user's view immediately.
const getCachedPublicWall = unstable_cache(
  queryPublicWall,
  ['tambayan-wall-approved-v1'],
  { revalidate: 30 }
);

export default async function WallPage() {
  const { posts, pinnedPosts } = await getCachedPublicWall();
  return <WallClient initialPosts={posts} initialPinnedPosts={pinnedPosts} />;
}
