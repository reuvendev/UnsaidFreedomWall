'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { isTeamRole, TeamRole } from '@/lib/team/types';
import { TeamRoleBadge } from './TeamRoleBadge';
import { VerifiedIcon } from './VerifiedIcon';

type Profile = { displayName: string; role: TeamRole };

export function TeamPublicIdentity({ teamAuthorId, fallbackName, compact = false, nameClassName = '' }: { teamAuthorId: string; fallbackName: string; compact?: boolean; nameClassName?: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => onSnapshot(doc(db, 'teamPublicProfiles', teamAuthorId), (snapshot) => {
    const data = snapshot.data();
    setProfile(snapshot.exists() && data?.verified === true && typeof data.displayName === 'string' && isTeamRole(data.role) ? { displayName: data.displayName, role: data.role } : null);
  }, () => setProfile(null)), [teamAuthorId]);

  return <span className="inline-flex min-w-0 flex-wrap items-center gap-1.5">
    <span className={nameClassName}>{profile?.displayName || fallbackName}</span>
    {profile && <><VerifiedIcon className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} shrink-0 text-blue-500`} /><TeamRoleBadge role={profile.role} /></>}
  </span>;
}
