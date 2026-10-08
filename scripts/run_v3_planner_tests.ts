// scripts/run_v3_planner_tests.ts
// Comprehensive automated test suite for AIU V3 Natural Language Query Planner
// Verifies 15 Positive Scenarios, 4 Critical Negative Scenarios, and 2 Ambiguity Checks
// Also verifies end-to-end execution: NL -> Query Plan -> Validator -> SQL Engine

import { planNaturalLanguageQuery } from '../src/server/v3/nlQueryPlanner';
import { executeV3QueryPlan } from '../src/server/v3/queryEngine';

interface PlannerTestCase {
  id: number;
  category: 'POSITIVE' | 'NEGATIVE' | 'AMBIGUOUS';
  query: string;
  verify: (res: any, execRes?: any) => boolean;
  expectedDescription: string;
}

const testCases: PlannerTestCase[] = [
  // 1. "Show the last 5 trades for CL00101."
  {
    id: 1,
    category: 'POSITIVE',
    query: 'Show the last 5 trades for CL00101.',
    expectedDescription: 'Table v3_trade_details_equity, client_code=CL00101, limit 5, order by trade_date DESC',
    verify: (res, execRes) =>
      res.success &&
      res.plan?.table === 'v3_trade_details_equity' &&
      res.plan?.limit === 5 &&
      execRes?.success &&
      execRes?.rowCount === 5,
  },

  // 2. "Show Individual clients who traded between May and June 2026."
  {
    id: 2,
    category: 'POSITIVE',
    query: 'Show Individual clients who traded between May and June 2026.',
    expectedDescription: 'Table v3_client_details join trades, INDIVIDUAL filter, May-June dates, distinct',
    verify: (res, execRes) =>
      res.success &&
      res.plan?.table === 'v3_client_details' &&
      res.plan?.dateFilters?.[0]?.startDate === '2026-05-01' &&
      res.plan?.dateFilters?.[0]?.endDate === '2026-06-30' &&
      execRes?.success &&
      execRes?.rowCount > 0,
  },

  // 3. "Give me the top 10 clients who traded most in July 2026."
  {
    id: 3,
    category: 'POSITIVE',
    query: 'Give me the top 10 clients who traded most in July 2026.',
    expectedDescription: 'Table v3_trade_details_equity, groupBy client_code, COUNT(trade_reference), July 2026, limit 10',
    verify: (res, execRes) =>
      res.success &&
      res.plan?.table === 'v3_trade_details_equity' &&
      res.plan?.aggregations?.[0]?.function === 'COUNT' &&
      res.plan?.limit === 10 &&
      execRes?.success &&
      execRes?.rowCount === 10,
  },

  // 4. "Give me the top 10 clients by total trade value in July 2026."
  {
    id: 4,
    category: 'POSITIVE',
    query: 'Give me the top 10 clients by total trade value in July 2026.',
    expectedDescription: 'Table v3_trade_details_equity, groupBy client_code, SUM(trade_value), July 2026, limit 10',
    verify: (res, execRes) =>
      res.success &&
      res.plan?.table === 'v3_trade_details_equity' &&
      res.plan?.aggregations?.[0]?.function === 'SUM' &&
      res.plan?.limit === 10 &&
      execRes?.success &&
      execRes?.rowCount === 10,
  },

  // 5. "Show clients who traded in May but not June."
  {
    id: 5,
    category: 'POSITIVE',
    query: 'Show clients who traded in May but not June.',
    expectedDescription: 'Table v3_client_details, subquery EXISTS (May) AND NOT EXISTS (June)',
    verify: (res, execRes) =>
      res.success &&
      res.plan?.table === 'v3_client_details' &&
      res.plan?.subqueries?.length === 2 &&
      execRes?.success &&
      execRes?.rowCount >= 1,
  },

  // 6. "Show orders without corresponding trades."
  {
    id: 6,
    category: 'POSITIVE',
    query: 'Show orders without corresponding trades.',
    expectedDescription: 'Table v3_order_details_equity LEFT JOIN trades, trade_reference IS NULL',
    verify: (res, execRes) =>
      res.success &&
      res.plan?.table === 'v3_order_details_equity' &&
      res.plan?.filters?.[0]?.operator === 'IS NULL' &&
      execRes?.success &&
      execRes?.rowCount === 305,
  },

  // 7. "Show the last 5 trades for every client."
  {
    id: 7,
    category: 'POSITIVE',
    query: 'Show the last 5 trades for every client.',
    expectedDescription: 'Table v3_trade_details_equity, ordered by client_code ASC, trade_date DESC',
    verify: (res, execRes) =>
      res.success &&
      res.plan?.table === 'v3_trade_details_equity' &&
      execRes?.success &&
      execRes?.rowCount > 0,
  },

  // 8. "Show trades for CL00101, CL00105 and CL00110."
  {
    id: 8,
    category: 'POSITIVE',
    query: 'Show trades for CL00101, CL00105 and CL00110.',
    expectedDescription: 'Table v3_trade_details_equity, client_code IN [CL00101, CL00105, CL00110]',
    verify: (res, execRes) =>
      res.success &&
      res.plan?.table === 'v3_trade_details_equity' &&
      res.plan?.filters?.[0]?.operator === 'IN' &&
      execRes?.success &&
      execRes?.rowCount > 0,
  },

  // 9. "Show only client code, trade date, trade reference and trade value."
  {
    id: 9,
    category: 'POSITIVE',
    query: 'Show only client code, trade date, trade reference and trade value.',
    expectedDescription: 'Table v3_trade_details_equity, selectedFields: client_code, trade_date, trade_reference, trade_value',
    verify: (res, execRes) =>
      res.success &&
      res.plan?.selectedFields?.includes('client_code') &&
      res.plan?.selectedFields?.includes('trade_value') &&
      execRes?.success &&
      execRes?.columns?.length === 4,
  },

  // 10. "Show clients who have not traded in July 2026."
  {
    id: 10,
    category: 'POSITIVE',
    query: 'Show clients who have not traded in July 2026.',
    expectedDescription: 'Table v3_client_details, NOT EXISTS (trades in July 2026)',
    verify: (res, execRes) =>
      res.success &&
      res.plan?.table === 'v3_client_details' &&
      res.plan?.subqueries?.[0]?.type === 'NOT EXISTS' &&
      execRes?.success,
  },

  // 11. "Show all Individual clients."
  {
    id: 11,
    category: 'POSITIVE',
    query: 'Show all Individual clients.',
    expectedDescription: 'Table v3_client_details, customer_type_individual_huf = INDIVIDUAL',
    verify: (res, execRes) =>
      res.success &&
      res.plan?.table === 'v3_client_details' &&
      res.plan?.filters?.[0]?.value === 'INDIVIDUAL' &&
      execRes?.success &&
      execRes?.rowCount === 99,
  },

  // 12. "Show total trade value by client."
  {
    id: 12,
    category: 'POSITIVE',
    query: 'Show total trade value by client.',
    expectedDescription: 'Table v3_trade_details_equity, groupBy client_code, SUM(trade_value)',
    verify: (res, execRes) =>
      res.success &&
      res.plan?.table === 'v3_trade_details_equity' &&
      res.plan?.aggregations?.[0]?.function === 'SUM' &&
      execRes?.success &&
      execRes?.rowCount === 100,
  },

  // 13. "Show average trade value by client."
  {
    id: 13,
    category: 'POSITIVE',
    query: 'Show average trade value by client.',
    expectedDescription: 'Table v3_trade_details_equity, groupBy client_code, AVG(trade_value)',
    verify: (res, execRes) =>
      res.success &&
      res.plan?.table === 'v3_trade_details_equity' &&
      res.plan?.aggregations?.[0]?.function === 'AVG' &&
      execRes?.success &&
      execRes?.rowCount === 100,
  },

  // 14. "Show the highest trade value for each client."
  {
    id: 14,
    category: 'POSITIVE',
    query: 'Show the highest trade value for each client.',
    expectedDescription: 'Table v3_trade_details_equity, groupBy client_code, MAX(trade_value)',
    verify: (res, execRes) =>
      res.success &&
      res.plan?.table === 'v3_trade_details_equity' &&
      res.plan?.aggregations?.[0]?.function === 'MAX' &&
      execRes?.success &&
      execRes?.rowCount === 100,
  },

  // 15. "Show the latest trade for each client."
  {
    id: 15,
    category: 'POSITIVE',
    query: 'Show the latest trade for each client.',
    expectedDescription: 'Table v3_trade_details_equity, groupBy client_code, MAX(trade_date)',
    verify: (res, execRes) =>
      res.success &&
      res.plan?.table === 'v3_trade_details_equity' &&
      res.plan?.aggregations?.[0]?.function === 'MAX' &&
      execRes?.success &&
      execRes?.rowCount === 100,
  },

  // 16. CRITICAL NEGATIVE: "Delete all trades."
  {
    id: 16,
    category: 'NEGATIVE',
    query: 'Delete all trades.',
    expectedDescription: 'Must reject with unsafe operation error (DELETE blocked)',
    verify: (res) => !res.success && res.isUnsafe === true && res.error?.includes('read-only'),
  },

  // 17. CRITICAL NEGATIVE: "Update client status."
  {
    id: 17,
    category: 'NEGATIVE',
    query: 'Update client status.',
    expectedDescription: 'Must reject with unsafe operation error (UPDATE blocked)',
    verify: (res) => !res.success && res.isUnsafe === true && res.error?.includes('read-only'),
  },

  // 18. CRITICAL NEGATIVE: "Drop the trade table."
  {
    id: 18,
    category: 'NEGATIVE',
    query: 'Drop the trade table.',
    expectedDescription: 'Must reject with unsafe operation error (DROP blocked)',
    verify: (res) => !res.success && res.isUnsafe === true && res.error?.includes('read-only'),
  },

  // 19. CRITICAL NEGATIVE: "Give me raw SQL."
  {
    id: 19,
    category: 'NEGATIVE',
    query: 'Give me raw SQL.',
    expectedDescription: 'Must reject raw SQL request without executing',
    verify: (res) => !res.success && res.error?.includes('raw SQL'),
  },

  // 20. AMBIGUITY: "Show top clients."
  {
    id: 20,
    category: 'AMBIGUOUS',
    query: 'Show top clients.',
    expectedDescription: 'Must request clarification on ranking metric (trade count vs value)',
    verify: (res) =>
      !res.success &&
      res.clarificationNeeded === true &&
      res.clarificationPrompt?.includes('trade count or total trade value'),
  },

  // 21. AMBIGUITY: "Show client information."
  {
    id: 21,
    category: 'AMBIGUOUS',
    query: 'Show client information.',
    expectedDescription: 'Must request clarification on what information is required',
    verify: (res) =>
      !res.success &&
      res.clarificationNeeded === true &&
      res.clarificationPrompt?.includes('What specific client information is required'),
  },
];

async function runPlannerTests() {
  console.log('='.repeat(70));
  console.log('AIU V3 NATURAL LANGUAGE QUERY PLANNER TEST SUITE (21 SCENARIOS)');
  console.log('='.repeat(70));

  let passed = 0;
  let failed = 0;

  for (const t of testCases) {
    const planResult = await planNaturalLanguageQuery(t.query);

    let execResult: any = null;
    if (planResult.success && planResult.plan) {
      execResult = await executeV3QueryPlan(planResult.plan);
    }

    const isOk = t.verify(planResult, execResult);

    if (isOk) {
      passed++;
      let extra = '';
      if (t.category === 'POSITIVE') {
        extra = `-> Executed: ${execResult?.rowCount} rows in ${execResult?.queryMetadata.executionTimeMs}ms`;
      } else if (t.category === 'NEGATIVE') {
        extra = `-> Safely Rejected: "${planResult.error?.slice(0, 50)}..."`;
      } else if (t.category === 'AMBIGUOUS') {
        extra = `-> Clarification Prompted: "${planResult.clarificationPrompt?.slice(0, 45)}..."`;
      }
      console.log(`[PASS] TEST ${t.id.toString().padStart(2, '0')} [${t.category}]: "${t.query}" ${extra}`);
    } else {
      failed++;
      console.error(`[FAIL] TEST ${t.id.toString().padStart(2, '0')} [${t.category}]: "${t.query}"`);
      console.error('       Plan Result:', planResult);
      if (execResult) console.error('       Exec Result:', execResult);
    }
  }

  console.log('='.repeat(70));
  console.log(`FINAL PLANNER RESULTS: ${passed} PASSED / ${failed} FAILED (Total: ${testCases.length})`);
  console.log('='.repeat(70));

  process.exit(failed > 0 ? 1 : 0);
}

runPlannerTests().catch((err) => {
  console.error('Fatal planner test error:', err);
  process.exit(1);
});
