// src/server/v3/nlPlannerTypes.ts
// Natural Language Query Planner Types for AIU V3
// Strictly isolated from V2

import { V3QueryPlan } from './queryPlanTypes';

export interface NLPlannerResult {
  success: boolean;
  plan?: V3QueryPlan;
  clarificationNeeded?: boolean;
  clarificationPrompt?: string;
  error?: string;
  isUnsafe?: boolean;
  source?: 'gemini' | 'semantic_rules';
  metadata?: {
    intentDetected?: string;
    entitiesExtracted?: {
      clientCodes?: string[];
      dateRanges?: string[];
      dimensions?: string[];
      aggregations?: string[];
    };
  };
}
