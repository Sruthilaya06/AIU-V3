// src/server/v3/queryBuilder.ts
// Deterministic Parameterized SQL Generator for AIU V3
// Strictly maps validated Query Plans into parameterized SQL queries

import { V3_TABLES } from '../../lib/v3_schema';
import { V3QueryPlan, V3Filter, V3DateFilter, V3Join } from './queryPlanTypes';
import { findApprovedRelationship } from './relationshipMap';

export interface BuiltSQLQuery {
  sql: string;
  params: any[];
  tablesUsed: string[];
  filtersApplied: string[];
}

/**
 * Resolves a field name to its qualified table.field name.
 */
function qualifyField(field: string, defaultTable: string, activeTables: string[]): string {
  if (field.includes('.')) {
    return field;
  }
  if (field === '*') {
    return '*';
  }

  // Look for which table contains this column
  for (const tbl of activeTables) {
    const meta = V3_TABLES[tbl];
    if (meta && meta.columns.some((c) => c.dbName === field)) {
      return `${tbl}.${field}`;
    }
  }

  return `${defaultTable}.${field}`;
}

/**
 * Builds parameterized SQL string and parameter values from a validated V3QueryPlan.
 */
export function buildV3SQL(plan: V3QueryPlan): BuiltSQLQuery {
  const tablesUsed: string[] = [plan.table];
  const filtersApplied: string[] = [];
  const params: any[] = [];

  // Track active tables
  if (plan.joins) {
    for (const j of plan.joins) {
      if (!tablesUsed.includes(j.table)) {
        tablesUsed.push(j.table);
      }
    }
  }

  // 1. SELECT clause
  const selectItems: string[] = [];

  if (plan.aggregations && plan.aggregations.length > 0) {
    // Projections include groupBy fields if any
    if (plan.groupBy) {
      for (const gb of plan.groupBy) {
        const qField = qualifyField(gb, plan.table, tablesUsed);
        selectItems.push(`${qField} AS ${gb}`);
      }
    }

    for (const agg of plan.aggregations) {
      const distinctStr = agg.distinct ? 'DISTINCT ' : '';
      if (agg.field === '*') {
        selectItems.push(`${agg.function}(${distinctStr}*) AS ${agg.alias}`);
      } else {
        const qField = qualifyField(agg.field, agg.table || plan.table, tablesUsed);
        selectItems.push(`${agg.function}(${distinctStr}${qField}) AS ${agg.alias}`);
      }
    }
  } else if (plan.selectedFields && plan.selectedFields.length > 0) {
    for (const field of plan.selectedFields) {
      const qField = qualifyField(field, plan.table, tablesUsed);
      // Give column clean alias if qualified
      const cleanAlias = field.includes('.') ? field.split('.')[1] : field;
      selectItems.push(`${qField} AS ${cleanAlias}`);
    }
  } else {
    // Default to primary table columns with clean names
    selectItems.push(`${plan.table}.*`);
  }

  const distinctModifier = plan.distinct ? 'DISTINCT ' : '';
  let sql = `SELECT ${distinctModifier}${selectItems.join(', ')} FROM ${plan.table}`;

  // 2. JOIN clauses
  if (plan.joins && plan.joins.length > 0) {
    const joinedTables = new Set<string>([plan.table]);

    for (const join of plan.joins) {
      const joinType = join.type || 'INNER';
      let joinCondition = '';

      if (join.on) {
        joinCondition = `${join.on.leftTable}.${join.on.leftField} = ${join.on.rightTable}.${join.on.rightField}`;
      } else {
        // Resolve using approved relationship map
        let foundRel = null;
        for (const existingTable of joinedTables) {
          foundRel = findApprovedRelationship(existingTable, join.table, join.relationshipId);
          if (foundRel) {
            joinCondition = `${foundRel.sourceTable}.${foundRel.sourceField} = ${foundRel.targetTable}.${foundRel.targetField}`;
            break;
          }
        }

        if (!foundRel) {
          throw new Error(`Cannot find approved join condition between existing tables and '${join.table}'.`);
        }
      }

      sql += ` ${joinType} JOIN ${join.table} ON ${joinCondition}`;
      joinedTables.add(join.table);
    }
  }

  // 3. WHERE clause
  const whereClauses: string[] = [];

  // Standard filters
  if (plan.filters && plan.filters.length > 0) {
    for (const f of plan.filters) {
      const qCol = qualifyField(f.field, f.table || plan.table, tablesUsed);

      switch (f.operator) {
        case '=':
        case '!=':
        case '<>':
        case '>':
        case '<':
        case '>=':
        case '<=':
        case 'LIKE':
        case 'NOT LIKE':
          whereClauses.push(`${qCol} ${f.operator} ?`);
          params.push(f.value);
          filtersApplied.push(`${f.field} ${f.operator} ?`);
          break;

        case 'IN':
        case 'NOT IN': {
          const list = Array.isArray(f.value) ? f.value : [f.value];
          if (list.length === 0) {
            // Empty IN condition
            if (f.operator === 'IN') {
              whereClauses.push('1 = 0');
            } else {
              whereClauses.push('1 = 1');
            }
          } else {
            const placeholders = list.map(() => '?').join(', ');
            whereClauses.push(`${qCol} ${f.operator} (${placeholders})`);
            params.push(...list);
          }
          filtersApplied.push(`${f.field} ${f.operator} (${list.length} values)`);
          break;
        }

        case 'IS NULL':
          whereClauses.push(`${qCol} IS NULL`);
          filtersApplied.push(`${f.field} IS NULL`);
          break;

        case 'IS NOT NULL':
          whereClauses.push(`${qCol} IS NOT NULL`);
          filtersApplied.push(`${f.field} IS NOT NULL`);
          break;

        case 'BETWEEN':
          if (Array.isArray(f.value) && f.value.length === 2) {
            whereClauses.push(`${qCol} BETWEEN ? AND ?`);
            params.push(f.value[0], f.value[1]);
            filtersApplied.push(`${f.field} BETWEEN ? AND ?`);
          }
          break;
      }
    }
  }

  // Date filters
  if (plan.dateFilters && plan.dateFilters.length > 0) {
    for (const df of plan.dateFilters) {
      const qCol = qualifyField(df.field, df.table || plan.table, tablesUsed);

      if (df.exactDate) {
        whereClauses.push(`${qCol} = ?`);
        params.push(df.exactDate);
        filtersApplied.push(`${df.field} = ${df.exactDate}`);
      } else {
        if (df.startDate) {
          whereClauses.push(`${qCol} >= ?`);
          params.push(df.startDate);
          filtersApplied.push(`${df.field} >= ${df.startDate}`);
        }
        if (df.endDate) {
          whereClauses.push(`${qCol} <= ?`);
          params.push(df.endDate);
          filtersApplied.push(`${df.field} <= ${df.endDate}`);
        }
      }
    }
  }

  // Subquery conditions (EXISTS / NOT EXISTS)
  if (plan.subqueries && plan.subqueries.length > 0) {
    for (const sq of plan.subqueries) {
      const innerBuilt = buildV3SQL(sq.subquery);
      let innerSql = innerBuilt.sql;

      // If correlated condition provided, inject correlation into subquery
      if (sq.correlateOn) {
        const corrCondition = `${sq.correlateOn.outerTable}.${sq.correlateOn.outerField} = ${sq.correlateOn.innerTable}.${sq.correlateOn.innerField}`;
        if (innerSql.includes(' WHERE ')) {
          innerSql = innerSql.replace(' WHERE ', ` WHERE ${corrCondition} AND `);
        } else {
          innerSql += ` WHERE ${corrCondition}`;
        }
      }

      whereClauses.push(`${sq.type} (${innerSql})`);
      params.push(...innerBuilt.params);
      filtersApplied.push(`${sq.type} (Subquery on ${sq.subquery.table})`);
    }
  }

  if (whereClauses.length > 0) {
    sql += ` WHERE ${whereClauses.join(' AND ')}`;
  }

  // 4. GROUP BY clause
  if (plan.groupBy && plan.groupBy.length > 0) {
    const gbItems = plan.groupBy.map((gb) => qualifyField(gb, plan.table, tablesUsed));
    sql += ` GROUP BY ${gbItems.join(', ')}`;
  }

  // 5. ORDER BY clause
  if (plan.orderBy && plan.orderBy.length > 0) {
    const obItems = plan.orderBy.map((ob) => {
      // If it's an aggregation alias, order by alias directly
      const isAggAlias = plan.aggregations?.some((a) => a.alias === ob.field);
      const fieldRef = isAggAlias ? ob.field : qualifyField(ob.field, ob.table || plan.table, tablesUsed);
      return `${fieldRef} ${ob.direction}`;
    });
    sql += ` ORDER BY ${obItems.join(', ')}`;
  }

  // 6. LIMIT and OFFSET clauses
  if (plan.limit !== undefined && plan.limit !== null) {
    sql += ' LIMIT ?';
    params.push(plan.limit);
  }

  if (plan.offset !== undefined && plan.offset !== null) {
    sql += ' OFFSET ?';
    params.push(plan.offset);
  }

  return {
    sql,
    params,
    tablesUsed,
    filtersApplied,
  };
}
