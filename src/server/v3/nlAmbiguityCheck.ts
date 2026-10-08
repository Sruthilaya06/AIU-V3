// src/server/v3/nlAmbiguityCheck.ts
// Ambiguity Detector for AIU V3 Natural Language Queries

export interface AmbiguityCheckResult {
  isAmbiguous: boolean;
  clarificationPrompt?: string;
}

/**
 * Evaluates whether a user's natural-language requirement is materially ambiguous.
 */
export function checkNLAmbiguity(query: string): AmbiguityCheckResult {
  const normalized = query.trim().toLowerCase().replace(/[.?]/g, '');

  // 1. "Show top clients" without metric
  if (/^show\s+(?:the\s+)?top\s+clients$/.test(normalized) || /^top\s+clients$/.test(normalized)) {
    return {
      isAmbiguous: true,
      clarificationPrompt:
        'Should top clients be ranked by trade count or total trade value? Please specify your ranking metric.',
    };
  }

  // 2. "Show client information" without target client or fields
  if (
    /^show\s+(?:the\s+)?client\s+information$/.test(normalized) ||
    /^client\s+information$/.test(normalized) ||
    /^show\s+client\s+details$/.test(normalized)
  ) {
    return {
      isAmbiguous: true,
      clarificationPrompt:
        'What specific client information is required? (e.g., account details, address, personal KYC, or trading activity? Please also specify a client code or criteria).',
    };
  }

  return { isAmbiguous: false };
}
