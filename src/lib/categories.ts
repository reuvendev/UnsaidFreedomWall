export const VALID_CATEGORIES = [
  'Thoughts',
  'Love & Connections',
  'Rants',
  'City Life',
  'Others',
] as const;

export type CategoryType = typeof VALID_CATEGORIES[number];

export function isValidCategory(category: string): boolean {
  return VALID_CATEGORIES.includes(category as CategoryType);
}

// Alias to fix any imports expecting CATEGORIES
export const CATEGORIES = VALID_CATEGORIES;