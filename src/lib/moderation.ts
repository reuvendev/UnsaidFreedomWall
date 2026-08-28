// Core profanity roots (both Tagalog and English)
const PROFANITY_ROOTS = [
  // Tagalog
  "tangina", "gago", "tanga", "putangina", "ulol", 
  "hayop", "leche", "bwisit", "punyeta", "tarantado", "kupal",
  "g@g0", "t@ng1n@", "bwiset", "g@go",
  // English
  "fuck", "shit", "bitch", "asshole", "cunt", "dick", 
  "bastard", "bullshit", "motherfucker", "fuk", "sh1t", "b!tch"
];

export function censorText(text: string): string {
  let sanitized = text;

  PROFANITY_ROOTS.forEach((word) => {
    const flexiblePattern = word
      .split('')
      .join('[\\s\\.\\-\\*_]*');
    
    const regex = new RegExp(flexiblePattern, 'gi');
    
    sanitized = sanitized.replace(regex, (match) => '*'.repeat(match.length));
  });

  return sanitized;
}