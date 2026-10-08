// src/server/v3/nlQueryPlanner.ts
// Master Natural Language Query Planner for AIU V3
// Integrates Security Checks -> Ambiguity Detection -> Gemini AI / Semantic Parser -> Query Validator

import { V3QueryPlan } from './queryPlanTypes';
import { NLPlannerResult } from './nlPlannerTypes';
import { checkNLSecurity } from './nlSecurityCheck';
import { checkNLAmbiguity } from './nlAmbiguityCheck';
import { planWithGemini } from './geminiPlanner';
import { parseWithSemanticRules } from './semanticRulePlanner';
import { validateV3QueryPlan } from './queryValidator';

/**
 * Plans a structured, validated V3QueryPlan from a plain-English user requirement.
 * NEVER outputs raw SQL.
 * NEVER allows destructive modifications or unapproved schema access.
 */
export async function planNaturalLanguageQuery(query: string): Promise<NLPlannerResult> {
  if (!query || typeof query !== 'string' || !query.trim()) {
    return {
      success: false,
      error: 'Query string cannot be empty.',
    };
  }

  const trimmed = query.trim();

  // 1. Critical Security Inspection
  const security = checkNLSecurity(trimmed);
  if (!security.isSafe) {
    return {
      success: false,
      isUnsafe: true,
      error: security.reason || 'Unsafe request rejected.',
    };
  }

  // 2. Ambiguity Detection
  const ambiguity = checkNLAmbiguity(trimmed);
  if (ambiguity.isAmbiguous) {
    return {
      success: false,
      clarificationNeeded: true,
      clarificationPrompt: ambiguity.clarificationPrompt,
    };
  }

  // 3. Attempt Gemini AI Planning
  let candidatePlan: V3QueryPlan | null = null;
  let plannerSource: 'gemini' | 'semantic_rules' = 'semantic_rules';

  try {
    const aiPlan = await planWithGemini(trimmed);
    if (aiPlan) {
      const aiValidation = validateV3QueryPlan(aiPlan);
      if (aiValidation.valid) {
        candidatePlan = aiPlan;
        plannerSource = 'gemini';
      }
    }
  } catch (err: any) {
    if (err.message?.includes('Unsupported or unsafe')) {
      return {
        success: false,
        isUnsafe: true,
        error: err.message,
      };
    }
  }

  // 4. Fallback to Grounded Semantic Parser if AI is unavailable or produces unvalidated output
  if (!candidatePlan) {
    const rulePlan = parseWithSemanticRules(trimmed);
    if (rulePlan) {
      const ruleValidation = validateV3QueryPlan(rulePlan);
      if (ruleValidation.valid) {
        candidatePlan = rulePlan;
        plannerSource = 'semantic_rules';
      }
    }
  }

  // 5. Final Plan Verification
  if (!candidatePlan) {
    return {
      success: false,
      error: 'Unable to formulate a precise query plan for this request. Please clarify the target entity, time period, or metrics required.',
    };
  }

  const finalValidation = validateV3QueryPlan(candidatePlan);
  if (!finalValidation.valid) {
    return {
      success: false,
      error: `Query plan validation failed: ${finalValidation.error}`,
    };
  }

  return {
    success: true,
    plan: candidatePlan,
    source: plannerSource,
  };
}
