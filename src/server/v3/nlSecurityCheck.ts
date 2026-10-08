// src/server/v3/nlSecurityCheck.ts
// Natural Language Security & Destructive Request Detection for AIU V3

export interface SecurityCheckResult {
  isSafe: boolean;
  reason?: string;
}

const DESTRUCTIVE_KEYWORDS = [
  /\bdelete\b/i,
  /\bdrop\b/i,
  /\btruncate\b/i,
  /\bupdate\b/i,
  /\binsert\b/i,
  /\balter\b/i,
  /\bcreate\s+table\b/i,
  /\bgrant\b/i,
  /\brevoke\b/i,
  /\bexec\b/i,
  /\bexecute\b/i,
];

const RAW_SQL_REQUEST_PATTERNS = [
  /\b(?:give|show|print|write|generate|return)\s+(?:me\s+)?(?:raw\s+)?sql\b/i,
  /\b(?:raw\s+sql|sql\s+query|sql\s+command|sql\s+statement)\b/i,
];

/**
 * Checks a natural-language query for unsafe or unsupported destructive requests.
 */
export function checkNLSecurity(query: string): SecurityCheckResult {
  const trimmed = query.trim();

  // Check for destructive DML / DDL operations
  for (const pattern of DESTRUCTIVE_KEYWORDS) {
    if (pattern.test(trimmed)) {
      return {
        isSafe: false,
        reason: 'Unsafe operation detected: The AIU system is read-only. Modification, creation, and deletion requests (INSERT, UPDATE, DELETE, DROP, TRUNCATE, ALTER) are strictly prohibited.',
      };
    }
  }

  // Check for requests asking for raw SQL syntax
  for (const pattern of RAW_SQL_REQUEST_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        isSafe: false,
        reason: 'Unsupported request: The AIU system does not generate or expose raw SQL statements to callers. Queries must be executed through structured Query Plans.',
      };
    }
  }

  return { isSafe: true };
}
