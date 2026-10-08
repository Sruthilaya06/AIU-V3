// src/server/v3/deterministicLookupPlanner.ts
// AIU V3 Deterministic Lookup Query Plan Synthesizer for Single & Bulk Search
// Builds pure deterministic V3QueryPlan objects without calling Gemini NL Planner.

import { V3QueryPlan, V3Filter, V3Join, V3Aggregation } from './queryPlanTypes';
import { V3_TABLES } from '../../lib/v3_schema';
import { APPROVED_RELATIONSHIPS } from './relationshipMap';

export interface DeterministicPlanInput {
  searchMode: 'single' | 'bulk';
  identifierType?: 'client_code' | 'pan' | 'form_number' | 'phone';
  singleIdentifier?: string;
  bulkIdentifiers?: string[];
  selectedFields: string[];
}

export const COMPUTED_METRICS_MAP: Record<
  string,
  { function: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX'; field: string; table: string; alias: string }
> = {
  trade_count: {
    function: 'COUNT',
    field: 'trade_reference',
    table: 'v3_trade_details_equity',
    alias: 'trade_count',
  },
  total_trade_value: {
    function: 'SUM',
    field: 'trade_value',
    table: 'v3_trade_details_equity',
    alias: 'total_trade_value',
  },
  avg_trade_value: {
    function: 'AVG',
    field: 'trade_value',
    table: 'v3_trade_details_equity',
    alias: 'avg_trade_value',
  },
  max_trade_value: {
    function: 'MAX',
    field: 'trade_value',
    table: 'v3_trade_details_equity',
    alias: 'max_trade_value',
  },
};

/**
 * Checks if a table has a specific column.
 */
function tableHasColumn(tableName: string, columnName: string): boolean {
  const tableDef = (V3_TABLES as any)[tableName];
  if (!tableDef) return false;
  return tableDef.columns.some((col: any) => col.dbName === columnName);
}

/**
 * Finds preferred table that owns a given column name.
 * If multiple tables have it (e.g. client_code), prefers the primary candidate table if specified.
 */
function findTableForColumn(columnName: string, preferredTable?: string): string | null {
  if (preferredTable && tableHasColumn(preferredTable, columnName)) {
    return preferredTable;
  }
  for (const [tableName, tableDef] of Object.entries(V3_TABLES)) {
    if (tableDef.columns.some((col) => col.dbName === columnName)) {
      return tableName;
    }
  }
  return null;
}

/**
 * Synthesizes a deterministic V3QueryPlan for Single Search or Bulk Search.
 */
export function buildDeterministicV3Plan(input: DeterministicPlanInput): V3QueryPlan {
  const { searchMode, identifierType, singleIdentifier, bulkIdentifiers, selectedFields } = input;

  // 1. Separate computed trade metrics from physical schema columns
  const selectedComputed = selectedFields.filter((f) => f in COMPUTED_METRICS_MAP);
  const selectedRegular = selectedFields.filter((f) => !(f in COMPUTED_METRICS_MAP));
  const hasComputedMetrics = selectedComputed.length > 0;

  // 2. Identify filter column and preferred filter table
  let idCol = 'client_code';
  let filterPreferredTable = 'v3_client_details';

  if (identifierType === 'pan') {
    idCol = 'client_pan_number';
    filterPreferredTable = 'v3_client_details';
  } else if (identifierType === 'form_number') {
    idCol = 'form_number';
    filterPreferredTable = 'v3_client_details';
  } else if (identifierType === 'phone') {
    idCol = 'user_mobile_number';
    filterPreferredTable = 'v3_user_address_details';
  } else {
    // client_code
    idCol = 'client_code';
    filterPreferredTable = 'v3_client_details';
  }

  // 3. Determine candidate primaryTable
  let primaryTable = 'v3_client_details';

  if (hasComputedMetrics) {
    // Computed metrics are trade-based
    primaryTable = 'v3_trade_details_equity';
  } else {
    const hasTradeFields = selectedRegular.some(
      (f) => tableHasColumn('v3_trade_details_equity', f) && f !== 'client_code'
    );
    const hasOrderFields = selectedRegular.some(
      (f) => tableHasColumn('v3_order_details_equity', f) && f !== 'client_code'
    );

    if (hasTradeFields) {
      primaryTable = 'v3_trade_details_equity';
    } else if (hasOrderFields) {
      primaryTable = 'v3_order_details_equity';
    } else if (selectedRegular.length > 0) {
      const firstTbl = findTableForColumn(selectedRegular[0]);
      if (firstTbl) primaryTable = firstTbl;
    }
  }

  // 4. Determine required tables for regular fields
  const requiredTables = new Set<string>([primaryTable]);

  for (const field of selectedRegular) {
    const tbl = findTableForColumn(field, primaryTable);
    if (tbl) {
      requiredTables.add(tbl);
    }
  }

  // 5. Ensure filter table is accounted for
  let filterTable = primaryTable;
  if (!tableHasColumn(primaryTable, idCol)) {
    filterTable = filterPreferredTable;
    requiredTables.add(filterTable);
  }

  // 6. Resolve joins using APPROVED_RELATIONSHIPS
  const joins: V3Join[] = [];
  const joinedTables = new Set<string>([primaryTable]);

  // If primaryTable is not v3_client_details and any required table cannot be directly joined,
  // ensure v3_client_details is added to bridge all relational paths
  if (primaryTable !== 'v3_client_details') {
    const needBridge = Array.from(requiredTables).some(
      (tbl) =>
        tbl !== primaryTable &&
        !APPROVED_RELATIONSHIPS.some(
          (r) =>
            (r.sourceTable === primaryTable && r.targetTable === tbl) ||
            (r.sourceTable === tbl && r.targetTable === primaryTable)
        )
    );

    if (needBridge && !joinedTables.has('v3_client_details')) {
      const bridgeRel = APPROVED_RELATIONSHIPS.find(
        (r) =>
          (r.sourceTable === primaryTable && r.targetTable === 'v3_client_details') ||
          (r.sourceTable === 'v3_client_details' && r.targetTable === primaryTable)
      );
      if (bridgeRel) {
        const isFwd = bridgeRel.sourceTable === primaryTable;
        joins.push({
          table: 'v3_client_details',
          type: 'INNER',
          on: {
            leftTable: primaryTable,
            leftField: isFwd ? bridgeRel.sourceField : bridgeRel.targetField,
            rightTable: 'v3_client_details',
            rightField: isFwd ? bridgeRel.targetField : bridgeRel.sourceField,
          },
          relationshipId: bridgeRel.id,
        });
        joinedTables.add('v3_client_details');
      }
    }
  }

  for (const targetTable of Array.from(requiredTables)) {
    if (joinedTables.has(targetTable)) continue;

    // Direct join with any already joined table
    for (const joined of Array.from(joinedTables)) {
      const rel = APPROVED_RELATIONSHIPS.find(
        (r) =>
          (r.sourceTable === joined && r.targetTable === targetTable) ||
          (r.sourceTable === targetTable && r.targetTable === joined)
      );
      if (rel) {
        const isFwd = rel.sourceTable === joined;
        joins.push({
          table: targetTable,
          type: 'INNER',
          on: {
            leftTable: joined,
            leftField: isFwd ? rel.sourceField : rel.targetField,
            rightTable: targetTable,
            rightField: isFwd ? rel.targetField : rel.sourceField,
          },
          relationshipId: rel.id,
        });
        joinedTables.add(targetTable);
        break;
      }
    }
  }

  // 7. Construct Filters
  const filters: V3Filter[] = [];
  if (searchMode === 'single' && singleIdentifier) {
    filters.push({
      field: idCol,
      table: filterTable,
      operator: '=',
      value: singleIdentifier,
    });
  } else if (searchMode === 'bulk' && bulkIdentifiers && bulkIdentifiers.length > 0) {
    filters.push({
      field: idCol,
      table: filterTable,
      operator: 'IN',
      value: bulkIdentifiers,
    });
  }

  // 8. If computed trade metrics were selected, formulate Aggregation Query Plan
  if (hasComputedMetrics) {
    const aggregations: V3Aggregation[] = selectedComputed.map((m) => COMPUTED_METRICS_MAP[m]);

    const plan: V3QueryPlan = {
      table: primaryTable,
      aggregations,
      joins: joins.length > 0 ? joins : undefined,
      filters: filters.length > 0 ? filters : undefined,
      limit: 50000,
    };

    if (selectedRegular.length > 0) {
      plan.selectedFields = selectedRegular;
      plan.groupBy = selectedRegular;
    }

    return plan;
  }

  // 9. Standard deterministic raw record lookup plan
  return {
    table: primaryTable,
    selectedFields: selectedRegular.length > 0 ? selectedRegular : ['client_code'],
    joins: joins.length > 0 ? joins : undefined,
    filters: filters.length > 0 ? filters : undefined,
    limit: 50000,
  };
}
