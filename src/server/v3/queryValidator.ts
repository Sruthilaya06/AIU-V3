// src/server/v3/queryValidator.ts
// Strict Query Plan Validator for AIU V3
// Enforces table allowlist, column existence, approved joins, operator restrictions, and read-only safety

import { V3_TABLES } from '../../lib/v3_schema';
import {
  V3QueryPlan,
  QueryValidationResult,
  AllowedOperator,
  AllowedAggregateFunction,
} from './queryPlanTypes';
import { findApprovedRelationship } from './relationshipMap';

const ALLOWED_OPERATORS: AllowedOperator[] = [
  '=',
  '!=',
  '<>',
  '>',
  '<',
  '>=',
  '<=',
  'IN',
  'NOT IN',
  'LIKE',
  'NOT LIKE',
  'IS NULL',
  'IS NOT NULL',
  'BETWEEN',
];

const ALLOWED_AGGREGATES: AllowedAggregateFunction[] = ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX'];

const FORBIDDEN_SQL_PATTERNS = [
  /\bUPDATE\b/i,
  /\bDELETE\b/i,
  /\bINSERT\b/i,
  /\bDROP\b/i,
  /\bALTER\b/i,
  /\bCREATE\b/i,
  /\bTRUNCATE\b/i,
  /\bEXEC\b/i,
  /\bEXECUTE\b/i,
  /\bSCRIPT\b/i,
  /;/g, // Semicolon injection prevention
  /--/g, // Comment injection prevention
  /\/\*/g,
];

const MAX_LIMIT = 50000;

/**
 * Validates a table and returns its column set.
 */
function getTableColumns(tableName: string): Set<string> | null {
  const meta = V3_TABLES[tableName];
  if (!meta) return null;
  return new Set(meta.columns.map((c) => c.dbName));
}

/**
 * Validates a column reference against the tables present in the query plan.
 */
function validateColumn(
  field: string,
  explicitTable: string | undefined,
  activeTables: Map<string, Set<string>>
): { valid: boolean; resolvedTable?: string; error?: string } {
  if (explicitTable) {
    const tableCols = activeTables.get(explicitTable);
    if (!tableCols) {
      return { valid: false, error: `Table '${explicitTable}' is not part of this query.` };
    }
    if (!tableCols.has(field)) {
      return {
        valid: false,
        error: `Field '${field}' does not exist on table '${explicitTable}'.`,
      };
    }
    return { valid: true, resolvedTable: explicitTable };
  }

  // Check if field is qualified as "table.field"
  if (field.includes('.')) {
    const [tbl, col] = field.split('.');
    const tableCols = activeTables.get(tbl);
    if (!tableCols) {
      return { valid: false, error: `Table '${tbl}' is not part of this query.` };
    }
    if (!tableCols.has(col)) {
      return { valid: false, error: `Field '${col}' does not exist on table '${tbl}'.` };
    }
    return { valid: true, resolvedTable: tbl };
  }

  // Field unqualified: look across active tables
  const matches: string[] = [];
  for (const [tbl, cols] of activeTables.entries()) {
    if (cols.has(field)) {
      matches.push(tbl);
    }
  }

  if (matches.length === 0) {
    return { valid: false, error: `Field '${field}' does not exist on any selected table.` };
  }

  return { valid: true, resolvedTable: matches[0] };
}

/**
 * Validates the entire V3QueryPlan.
 */
export function validateV3QueryPlan(plan: V3QueryPlan): QueryValidationResult {
  if (!plan || typeof plan !== 'object') {
    return { valid: false, error: 'Query plan must be a non-null object.' };
  }

  // 1. Table exists
  if (!plan.table || typeof plan.table !== 'string') {
    return { valid: false, error: "A primary 'table' is required." };
  }

  const primaryCols = getTableColumns(plan.table);
  if (!primaryCols) {
    return {
      valid: false,
      error: `Invalid table: '${plan.table}'. Allowed tables: ${Object.keys(V3_TABLES).join(', ')}`,
    };
  }

  const activeTables = new Map<string, Set<string>>();
  activeTables.set(plan.table, primaryCols);

  // 2. Validate joins
  if (plan.joins && Array.isArray(plan.joins)) {
    for (const join of plan.joins) {
      if (!join.table) {
        return { valid: false, error: 'Join must specify a target table.' };
      }
      const joinCols = getTableColumns(join.table);
      if (!joinCols) {
        return { valid: false, error: `Invalid join target table: '${join.table}'.` };
      }

      // Check if relationship is approved
      let relApproved = false;
      for (const existingTable of activeTables.keys()) {
        const rel = findApprovedRelationship(existingTable, join.table, join.relationshipId);
        if (rel) {
          relApproved = true;
          break;
        }
      }

      if (!relApproved) {
        return {
          valid: false,
          error: `Unapproved join between existing tables and '${join.table}'. Joins must use predefined relationships.`,
        };
      }

      activeTables.set(join.table, joinCols);
    }
  }

  // Collect aggregation aliases
  const aggAliases = new Set<string>(plan.aggregations?.map((a) => a.alias) || []);

  // 3. Validate selected fields
  if (plan.selectedFields && Array.isArray(plan.selectedFields)) {
    for (const field of plan.selectedFields) {
      if (typeof field !== 'string') {
        return { valid: false, error: 'Selected field names must be strings.' };
      }
      // Check for dangerous strings
      for (const pattern of FORBIDDEN_SQL_PATTERNS) {
        if (pattern.test(field)) {
          return { valid: false, error: `Dangerous pattern detected in field: '${field}'` };
        }
      }
      if (!aggAliases.has(field)) {
        const val = validateColumn(field, undefined, activeTables);
        if (!val.valid) {
          return { valid: false, error: val.error };
        }
      }
    }
  }

  // 4. Validate filters
  if (plan.filters && Array.isArray(plan.filters)) {
    for (const f of plan.filters) {
      if (!ALLOWED_OPERATORS.includes(f.operator)) {
        return {
          valid: false,
          error: `Unsupported operator '${f.operator}'. Allowed operators: ${ALLOWED_OPERATORS.join(', ')}`,
        };
      }

      const colVal = validateColumn(f.field, f.table, activeTables);
      if (!colVal.valid) {
        return { valid: false, error: colVal.error };
      }

      // Check values for SQL injection strings if string
      if (typeof f.value === 'string') {
        for (const pattern of FORBIDDEN_SQL_PATTERNS) {
          if (pattern.test(f.value)) {
            return {
              valid: false,
              error: `Potential SQL injection attempt detected in filter value: '${f.value}'`,
            };
          }
        }
      } else if (Array.isArray(f.value)) {
        for (const item of f.value) {
          if (typeof item === 'string') {
            for (const pattern of FORBIDDEN_SQL_PATTERNS) {
              if (pattern.test(item)) {
                return { valid: false, error: `Potential SQL injection attempt in filter list item.` };
              }
            }
          }
        }
      }
    }
  }

  // 5. Validate date filters
  if (plan.dateFilters && Array.isArray(plan.dateFilters)) {
    for (const df of plan.dateFilters) {
      const colVal = validateColumn(df.field, df.table, activeTables);
      if (!colVal.valid) {
        return { valid: false, error: colVal.error };
      }
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (df.startDate && !dateRegex.test(df.startDate)) {
        return { valid: false, error: `Invalid startDate format '${df.startDate}'. Use YYYY-MM-DD.` };
      }
      if (df.endDate && !dateRegex.test(df.endDate)) {
        return { valid: false, error: `Invalid endDate format '${df.endDate}'. Use YYYY-MM-DD.` };
      }
      if (df.exactDate && !dateRegex.test(df.exactDate)) {
        return { valid: false, error: `Invalid exactDate format '${df.exactDate}'. Use YYYY-MM-DD.` };
      }
    }
  }

  // 6. Validate aggregations
  if (plan.aggregations && Array.isArray(plan.aggregations)) {
    for (const agg of plan.aggregations) {
      if (!ALLOWED_AGGREGATES.includes(agg.function)) {
        return {
          valid: false,
          error: `Unsupported aggregation function '${agg.function}'. Allowed: ${ALLOWED_AGGREGATES.join(', ')}`,
        };
      }
      if (agg.field !== '*') {
        const colVal = validateColumn(agg.field, agg.table, activeTables);
        if (!colVal.valid) {
          return { valid: false, error: colVal.error };
        }
      }
      if (!agg.alias || typeof agg.alias !== 'string' || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(agg.alias)) {
        return { valid: false, error: `Invalid aggregation alias '${agg.alias}'.` };
      }
      aggAliases.add(agg.alias);
    }
  }

  // 7. Validate Group By
  if (plan.groupBy && Array.isArray(plan.groupBy)) {
    for (const gb of plan.groupBy) {
      const colVal = validateColumn(gb, undefined, activeTables);
      if (!colVal.valid) {
        return { valid: false, error: colVal.error };
      }
    }
  }

  // 8. Validate Order By
  if (plan.orderBy && Array.isArray(plan.orderBy)) {
    for (const ob of plan.orderBy) {
      if (ob.direction !== 'ASC' && ob.direction !== 'DESC') {
        return { valid: false, error: `Order direction must be 'ASC' or 'DESC', got '${ob.direction}'.` };
      }
      // If it's not an aggregation alias, it must be a valid column
      if (!aggAliases.has(ob.field)) {
        const colVal = validateColumn(ob.field, ob.table, activeTables);
        if (!colVal.valid) {
          return { valid: false, error: colVal.error };
        }
      }
    }
  }

  // 9. Validate Limit & Offset
  if (plan.limit !== undefined && plan.limit !== null) {
    if (!Number.isInteger(plan.limit) || plan.limit < 0) {
      return { valid: false, error: 'Limit must be a non-negative integer.' };
    }
    if (plan.limit > MAX_LIMIT) {
      return { valid: false, error: `Limit cannot exceed ${MAX_LIMIT}.` };
    }
  }

  if (plan.offset !== undefined && plan.offset !== null) {
    if (!Number.isInteger(plan.offset) || plan.offset < 0) {
      return { valid: false, error: 'Offset must be a non-negative integer.' };
    }
  }

  return { valid: true };
}
