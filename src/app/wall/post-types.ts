// Shared serializable public view of a Freedom Wall entry.
// IMPORTANT: never include userId, email, device data, IP address, or moderation notes.
export interface PostProps {
  id: string;
  authorAlias: string;
  content: string;
  category: string;
  createdAt: string;
  upvotes: number;
  replies: number;
  spotifyTrackId?: string;
  imageUrl?: string;
  isDeveloperPost?: boolean;
  isStaffPost?: boolean;
  staffRole?: string;
  teamAuthorId?: string;
  isPinned?: boolean;
  cardTheme?: { background: string; border: string };
}

// Deterministic date formatting on the server and client avoids hydration mismatches.
export function formatWallDate(value: unknown): string {
  if (!value || typeof value !== 'object' || !(('toDate') in value)) {
    return 'Just now';
  }
  const toDate = (value as { toDate?: () => Date }).toDate;
  if (typeof toDate !== 'function') return 'Just now';
  let date: Date;
  try { date = toDate.call(value); } catch { return 'Just now'; }
  if (Number.isNaN(date.getTime())) return 'Just now';

  const datePart = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric',
  }).format(date);
  const timePart = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', hour12: true,
  }).format(date);
  return `${datePart} at ${timePart}`;
}

export function mapPublicWallPost(id: string, data: Record<string, any>): PostProps {
  return {
    id,
    authorAlias: data.authorAlias || 'Louisian',
    content: typeof data.content === 'string' ? data.content : '',
    category: data.category || 'thoughts',
    createdAt: formatWallDate(data.createdAt),
    upvotes: Number(data.upvotes) || 0,
    replies: Number(data.replies) || 0,
    spotifyTrackId: data.spotifyTrackId || undefined,
    imageUrl: data.imageUrl || undefined,
    isStaffPost: data.isStaffPost === true,
    staffRole: data.staffRole || undefined,
    teamAuthorId: typeof data.teamAuthorId === 'string' ? data.teamAuthorId : undefined,
    isDeveloperPost: data.isDeveloperPost === true,
    isPinned: data.isPinned === true,
    cardTheme: data.cardTheme &&
      typeof data.cardTheme.background === 'string' &&
      typeof data.cardTheme.border === 'string'
        ? { background: data.cardTheme.background, border: data.cardTheme.border }
        : undefined,
  };
}
