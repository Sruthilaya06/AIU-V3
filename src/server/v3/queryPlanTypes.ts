// src/server/v3/queryPlanTypes.ts
// Structured Query Plan and Execution Types for AIU V3 Deterministic SQL Engine
// Isolated from V2 functionality

export type AllowedOperator =
  | '='
  | '!='
  | '<>'
  | '>'
  | '<'
  | '>='
  | '<='
  | 'IN'
  | 'NOT IN'
  | 'LIKE'
  | 'NOT LIKE'
  | 'IS NULL'
  | 'IS NOT NULL'
  | 'BETWEEN';

export type AllowedAggregateFunction = 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';

export type JoinType = 'INNER' | 'LEFT';

export interface V3Filter {
  table?: string;
  field: string;
  operator: AllowedOperator;
  value?: any; // Single value, array (for IN), tuple [start, end] (for BETWEEN), or omitted for IS NULL
}

export interface V3DateFilter {
  table?: string;
  field: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  exactDate?: string; // YYYY-MM-DD
}

export interface V3Join {
  table: string; // Target table to join
  type?: JoinType; // Default 'INNER'
  on?: {
    leftTable: string;
    leftField: string;
    rightTable: string;
    rightField: string;
  };
  relationshipId?: string; // Predefined relationship identifier
}

export interface V3Aggregation {
  function: AllowedAggregateFunction;
  field: string; // column name or '*' for COUNT
  table?: string;
  alias: string;
  distinct?: boolean;
}

export interface V3OrderBy {
  field: string;
  table?: string;
  direction: 'ASC' | 'DESC';
}

export interface V3SubqueryCondition {
  type: 'EXISTS' | 'NOT EXISTS';
  subquery: V3QueryPlan;
  correlateOn?: {
    outerTable: string;
    outerField: string;
    innerTable: string;
    innerField: string;
  };
}

export interface V3QueryPlan {
  // Primary source table
  table: string;

  // Additional tables or joins
  joins?: V3Join[];

  // Output columns to project (empty or omitted means all allowed columns of primary table)
  selectedFields?: string[];

  // Distinct rows
  distinct?: boolean;

  // Standard filters
  filters?: V3Filter[];

  // Explicit date filters
  dateFilters?: V3DateFilter[];

  // Subquery conditions (EXISTS / NOT EXISTS)
  subqueries?: V3SubqueryCondition[];

  // Grouping
  groupBy?: string[];

  // Aggregate projections
  aggregations?: V3Aggregation[];

  // Ordering
  orderBy?: V3OrderBy[];

  // Pagination / row limit
  limit?: number;
  offset?: number;
}

export interface QueryValidationResult {
  valid: boolean;
  error?: string;
  code?: string;
  details?: Record<string, any>;
}

export interface V3QueryResultRow {
  [key: string]: any;
}

export interface V3QueryExecutionResult {
  success: boolean;
  columns: string[];
  rows: V3QueryResultRow[];
  rowCount: number;
  queryMetadata: {
    tablesUsed: string[];
    filtersApplied: string[];
    executionTimeMs: number;
    sqlGenerated?: string;
  };
  error?: string;
}
