export const TEAM_ROLES = ['owner', 'admin', 'moderator', 'marketing'] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

export const TEAM_STATUSES = ['active', 'suspended', 'revoked'] as const;
export type TeamStatus = (typeof TEAM_STATUSES)[number];

export type TeamSession = {
  uid: string;
  displayName: string;
  email: string;
  role: TeamRole;
  status: TeamStatus;
};

export function isTeamRole(value: unknown): value is TeamRole {
  return typeof value === 'string' && (TEAM_ROLES as readonly string[]).includes(value);
}

export function isTeamStatus(value: unknown): value is TeamStatus {
  return typeof value === 'string' && (TEAM_STATUSES as readonly string[]).includes(value);
}

export function canModerate(role: TeamRole) {
  return role === 'owner' || role === 'admin' || role === 'moderator';
}

export function canManageMembers(role: TeamRole) {
  return role === 'owner' || role === 'admin';
}

export const roleLabel = (role: TeamRole) =>
  role === 'owner' ? 'Founder' : role === 'admin' ? 'Admin' : role === 'moderator' ? 'Moderator' : 'Marketing';
