// src/server/v3/queryEngine.ts
// AIU V3 Deterministic SQL-First Query Engine
// Converts structured Query Plans into safe parameterized SQL and executes against isolated V3 database

import { V3QueryPlan, V3QueryExecutionResult } from './queryPlanTypes';
import { validateV3QueryPlan } from './queryValidator';
import { buildV3SQL } from './queryBuilder';
import { executeV3ParameterizedQuery } from './v3_db';

/**
 * Validates, compiles, and executes a structured V3 Query Plan.
 */
export async function executeV3QueryPlan(plan: V3QueryPlan): Promise<V3QueryExecutionResult> {
  const startTime = performance.now();

  // 1. Strict Query Validation
  const validation = validateV3QueryPlan(plan);
  if (!validation.valid) {
    const executionTimeMs = Math.round((performance.now() - startTime) * 100) / 100;
    return {
      success: false,
      columns: [],
      rows: [],
      rowCount: 0,
      queryMetadata: {
        tablesUsed: plan?.table ? [plan.table] : [],
        filtersApplied: [],
        executionTimeMs,
      },
      error: validation.error || 'Query plan validation failed.',
    };
  }

  try {
    // 2. Safe Parameterized SQL Generation
    const { sql, params, tablesUsed, filtersApplied } = buildV3SQL(plan);

    // 3. Execution via Prepared Statements
    const result = await executeV3ParameterizedQuery(sql, params);

    return {
      success: true,
      columns: result.columns,
      rows: result.rows,
      rowCount: result.rowCount,
      queryMetadata: {
        tablesUsed,
        filtersApplied,
        executionTimeMs: result.executionTimeMs,
        sqlGenerated: sql,
      },
    };
  } catch (err: any) {
    const executionTimeMs = Math.round((performance.now() - startTime) * 100) / 100;
    return {
      success: false,
      columns: [],
      rows: [],
      rowCount: 0,
      queryMetadata: {
        tablesUsed: plan.table ? [plan.table] : [],
        filtersApplied: [],
        executionTimeMs,
      },
      error: `Query Execution Error: ${err.message || 'Unknown database execution error'}`,
    };
  }
}
