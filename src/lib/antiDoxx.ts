// src/lib/antiDoxx.ts

// Regex patterns to detect potential doxxing or sensitive info
const PHONE_REGEX = /(?:(?:\+|00)?63[\s.-]?|0)?[1-9]\d{1,2}[\s.-]?\d{3}[\s.-]?\d{4}|\b\d{10,11}\b/i;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i;
const SOCIAL_REGEX = /(?:facebook\.com|fb\.com|instagram\.com|ig\.me|t\.me|twitter\.com|x\.com)(?:[\s\S]*?\/|\s+[a-zA-Z0-9._-]+)/i;
const SPECIFIC_ADDRESS_PATTERNS = /(house|lot|unit|street|st\.|purok|barangay|bgy\.)\s+[0-9a-zA-Z\s,]+/i;

export interface DoxxCheckResult {
  hasPotentialDoxx: boolean;
  matchedPatterns: string[];
}

/**
 * Inspects a given text string for potential personal data / doxxing risks.
 * @param content The text content to check.
 * @returns An object containing whether doxxing was detected and the specific matched violations.
 */
export function checkForDoxxing(content: string): DoxxCheckResult {
  if (!content || typeof content !== 'string') {
    return { hasPotentialDoxx: false, matchedPatterns: [] };
  }

  const matches: string[] = [];

  if (PHONE_REGEX.test(content)) {
    matches.push("Phone number detected");
  }
  if (EMAIL_REGEX.test(content)) {
    matches.push("Email address detected");
  }
  if (SOCIAL_REGEX.test(content)) {
    matches.push("Social media link detected");
  }
  if (SPECIFIC_ADDRESS_PATTERNS.test(content)) {
    matches.push("Specific residential address detected");
  }

  return {
    hasPotentialDoxx: matches.length > 0,
    matchedPatterns: matches,
  };
}

/**
 * Sanitizes input text by cleaning up whitespace and formatting.
 */
export function sanitizeContent(content: string): string {
  if (!content || typeof content !== 'string') return '';
  return content.trim().replace(/\s+/g, ' ');
}