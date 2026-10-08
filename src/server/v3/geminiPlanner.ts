// src/server/v3/geminiPlanner.ts
// Gemini AI Natural Language Query Planner for AIU V3
// Uses @google/genai TypeScript SDK to translate user requirements into V3QueryPlan JSON
// Strictly server-side only with timeout resilience

import { GoogleGenAI } from '@google/genai';
import { V3QueryPlan } from './queryPlanTypes';

const SYSTEM_INSTRUCTION = `
You are the AIU V3 Natural Language Query Planner.
Your job is to translate user natural language audit requests into a structured V3QueryPlan JSON object.

RULES:
1. NEVER output raw SQL, code blocks, or explanatory markdown text.
2. Output MUST be ONLY valid JSON matching the V3QueryPlan structure.
3. NEVER invent table names or column names.
4. ONLY use the 7 approved tables:
   - v3_user_details
   - v3_client_details
   - v3_user_account_information
   - v3_user_address_details
   - v3_user_personal_details
   - v3_order_details_equity
   - v3_trade_details_equity
5. Metric & Aggregation mappings:
   - "traded most" / "number of trades" / "trade count" -> { function: "COUNT", field: "trade_reference", alias: "trade_count" }
   - "total trade value" / "trade value" (when aggregated) -> { function: "SUM", field: "trade_value", alias: "total_trade_value" }
   - "average trade value" -> { function: "AVG", field: "trade_value", alias: "avg_trade_value" }
   - "highest trade value" / "max trade value" -> { function: "MAX", field: "trade_value", alias: "max_trade_value" }
   - "lowest trade value" / "min trade value" -> { function: "MIN", field: "trade_value", alias: "min_trade_value" }
   - CRITICAL: When multiple metrics are requested (e.g. "trade count and trade value", "number of trades and total trade value", "average trade value and number of trades", "highest trade value and total trade value"), include ALL requested aggregations in the "aggregations" array! NEVER drop a requested metric.
   - When aggregations are requested per client, ALWAYS include groupBy: ["client_code"].
   - "individual clients" -> customer_type_individual_huf = 'INDIVIDUAL'
6. Dates MUST be converted to explicit 'YYYY-MM-DD' boundaries:
   - "July 2026" -> startDate: "2026-07-01", endDate: "2026-07-31"
   - "May 2026" -> startDate: "2026-05-01", endDate: "2026-05-31"
   - "June 2026" -> startDate: "2026-06-01", endDate: "2026-06-30"
   - "May to June 2026" / "between May and June 2026" -> startDate: "2026-05-01", endDate: "2026-06-30"
7. Do not invent joins. Joins must use:
   - v3_client_details <-> v3_trade_details_equity on client_code
   - v3_client_details <-> v3_order_details_equity on client_code
   - v3_order_details_equity <-> v3_trade_details_equity on order_reference = trade_order_reference
8. If the user asks to DELETE, UPDATE, INSERT, DROP, ALTER, or asks for raw SQL, respond with:
   {"error": "Unsupported or unsafe operation"}
`.trim();

/**
 * Invokes Gemini 3.8 Flash to interpret a natural language query and produce a V3QueryPlan.
 * Includes a timeout promise to protect against network delays or API spikes.
 */
export async function planWithGemini(query: string, timeoutMs: number = 2500): Promise<V3QueryPlan | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const generatePromise = async (): Promise<V3QueryPlan | null> => {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `User Query: "${query}"\nGenerate the V3QueryPlan JSON.`,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          temperature: 0,
        },
      });

      const text = response.text?.trim();
      if (!text) return null;

      const parsed = JSON.parse(text);
      if (parsed.error) {
        throw new Error(parsed.error);
      }
      return parsed as V3QueryPlan;
    } catch (err: any) {
      if (err.message?.includes('Unsupported or unsafe')) {
        throw err;
      }
      return null;
    }
  };

  const timeoutPromise = new Promise<null>((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    if (timer.unref) {
      timer.unref();
    }
  });

  return Promise.race([generatePromise(), timeoutPromise]);
}
