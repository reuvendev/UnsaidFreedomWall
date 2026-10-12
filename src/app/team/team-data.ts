export interface TeamMember {
  fullName: string;
  role: string;
  description?: string;
}

export interface TeamGroup {
  name: 'Development' | 'Moderation' | 'Marketing';
  description: string;
  members: TeamMember[];
}

// Add public team members here once their full names and roles are confirmed.
export const teamGroups: TeamGroup[] = [
  {
    name: 'Development',
    description: 'Builds, maintains, and improves the TambayanSLU platform.',
    members: [
      {
        fullName: 'Nevz',
        role: 'Lead Developer',
        description: 'Oversees the development and maintenance of TambayanSLU.',
      },
    ],
  },
  {
    name: 'Moderation',
    description: 'Helps enforce community guidelines and keep participation safer.',
    members: [],
  },
  {
    name: 'Marketing',
    description: 'Shares TambayanSLU updates and helps the project reach the community.',
    members: [],
  },
];
