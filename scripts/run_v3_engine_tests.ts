// scripts/run_v3_engine_tests.ts
// Test runner for AIU V3 Query Engine verifying all 19 required test scenarios

import { executeV3QueryPlan } from '../src/server/v3/queryEngine';
import { V3QueryPlan } from '../src/server/v3/queryPlanTypes';

interface TestCase {
  id: number;
  name: string;
  plan: V3QueryPlan;
  expectSuccess: boolean;
  validate?: (res: any) => boolean;
}

const tests: TestCase[] = [
  // TEST 1: Retrieve client CL00101
  {
    id: 1,
    name: 'Retrieve client CL00101',
    plan: {
      table: 'v3_client_details',
      filters: [{ field: 'client_code', operator: '=', value: 'CL00101' }],
    },
    expectSuccess: true,
    validate: (res) => res.rowCount === 1 && res.rows[0].client_code === 'CL00101',
  },

  // TEST 2: Retrieve all trades for CL00101
  {
    id: 2,
    name: 'Retrieve all trades for CL00101',
    plan: {
      table: 'v3_trade_details_equity',
      filters: [{ field: 'client_code', operator: '=', value: 'CL00101' }],
    },
    expectSuccess: true,
    validate: (res) => res.rowCount > 0 && res.rows.every((r: any) => r.client_code === 'CL00101'),
  },

  // TEST 3: Retrieve latest 5 trades for CL00101
  {
    id: 3,
    name: 'Retrieve latest 5 trades for CL00101',
    plan: {
      table: 'v3_trade_details_equity',
      filters: [{ field: 'client_code', operator: '=', value: 'CL00101' }],
      orderBy: [{ field: 'trade_date', direction: 'DESC' }],
      limit: 5,
    },
    expectSuccess: true,
    validate: (res) => res.rowCount === 5 && res.rows[0].trade_date >= res.rows[1].trade_date,
  },

  // TEST 4: Retrieve trades between 2026-05-01 and 2026-06-30
  {
    id: 4,
    name: 'Retrieve trades between 2026-05-01 and 2026-06-30',
    plan: {
      table: 'v3_trade_details_equity',
      dateFilters: [
        { field: 'trade_date', startDate: '2026-05-01', endDate: '2026-06-30' },
      ],
    },
    expectSuccess: true,
    validate: (res) =>
      res.rowCount > 0 &&
      res.rows.every((r: any) => r.trade_date >= '2026-05-01' && r.trade_date <= '2026-06-30'),
  },

  // TEST 5: Retrieve all Individual clients
  {
    id: 5,
    name: 'Retrieve all Individual clients',
    plan: {
      table: 'v3_client_details',
      filters: [{ field: 'customer_type_individual_huf', operator: '=', value: 'INDIVIDUAL' }],
    },
    expectSuccess: true,
    validate: (res) =>
      res.rowCount > 0 &&
      res.rows.every((r: any) => r.customer_type_individual_huf === 'INDIVIDUAL'),
  },

  // TEST 6: Retrieve Individual clients who traded between May and June 2026
  {
    id: 6,
    name: 'Retrieve Individual clients who traded between May and June 2026',
    plan: {
      table: 'v3_client_details',
      joins: [{ table: 'v3_trade_details_equity', type: 'INNER' }],
      filters: [{ field: 'customer_type_individual_huf', operator: '=', value: 'INDIVIDUAL' }],
      dateFilters: [
        { field: 'trade_date', startDate: '2026-05-01', endDate: '2026-06-30' },
      ],
      selectedFields: ['client_code', 'customer_type_individual_huf', 'client_pan_number'],
      distinct: true,
    },
    expectSuccess: true,
    validate: (res) => res.rowCount > 0 && res.rows.every((r: any) => r.client_code.startsWith('CL')),
  },

  // TEST 7: Count trades by client
  {
    id: 7,
    name: 'Count trades by client',
    plan: {
      table: 'v3_trade_details_equity',
      groupBy: ['client_code'],
      aggregations: [
        { function: 'COUNT', field: 'trade_reference', alias: 'trade_count' },
      ],
      orderBy: [{ field: 'trade_count', direction: 'DESC' }],
    },
    expectSuccess: true,
    validate: (res) =>
      res.rowCount === 100 &&
      res.columns.includes('client_code') &&
      res.columns.includes('trade_count') &&
      res.rows[0].trade_count >= res.rows[res.rowCount - 1].trade_count,
  },

  // TEST 8: Top 10 clients by trade count during July 2026
  {
    id: 8,
    name: 'Top 10 clients by trade count during July 2026',
    plan: {
      table: 'v3_trade_details_equity',
      dateFilters: [
        { field: 'trade_date', startDate: '2026-07-01', endDate: '2026-07-31' },
      ],
      groupBy: ['client_code'],
      aggregations: [
        { function: 'COUNT', field: 'trade_reference', alias: 'trade_count' },
      ],
      orderBy: [{ field: 'trade_count', direction: 'DESC' }],
      limit: 10,
    },
    expectSuccess: true,
    validate: (res) => res.rowCount === 10 && res.rows[0].trade_count >= res.rows[9].trade_count,
  },

  // TEST 9: Top 10 clients by total trade value during July 2026
  {
    id: 9,
    name: 'Top 10 clients by total trade value during July 2026',
    plan: {
      table: 'v3_trade_details_equity',
      dateFilters: [
        { field: 'trade_date', startDate: '2026-07-01', endDate: '2026-07-31' },
      ],
      groupBy: ['client_code'],
      aggregations: [
        { function: 'SUM', field: 'trade_value', alias: 'total_trade_value' },
      ],
      orderBy: [{ field: 'total_trade_value', direction: 'DESC' }],
      limit: 10,
    },
    expectSuccess: true,
    validate: (res) =>
      res.rowCount === 10 && res.rows[0].total_trade_value >= res.rows[9].total_trade_value,
  },

  // TEST 10: Retrieve clients who traded in May but not June
  {
    id: 10,
    name: 'Retrieve clients who traded in May but not June',
    plan: {
      table: 'v3_client_details',
      selectedFields: ['client_code', 'customer_type_individual_huf'],
      subqueries: [
        {
          type: 'EXISTS',
          correlateOn: {
            outerTable: 'v3_client_details',
            outerField: 'client_code',
            innerTable: 'v3_trade_details_equity',
            innerField: 'client_code',
          },
          subquery: {
            table: 'v3_trade_details_equity',
            selectedFields: ['trade_reference'],
            dateFilters: [{ field: 'trade_date', startDate: '2026-05-01', endDate: '2026-05-31' }],
          },
        },
        {
          type: 'NOT EXISTS',
          correlateOn: {
            outerTable: 'v3_client_details',
            outerField: 'client_code',
            innerTable: 'v3_trade_details_equity',
            innerField: 'client_code',
          },
          subquery: {
            table: 'v3_trade_details_equity',
            selectedFields: ['trade_reference'],
            dateFilters: [{ field: 'trade_date', startDate: '2026-06-01', endDate: '2026-06-30' }],
          },
        },
      ],
    },
    expectSuccess: true,
    validate: (res) => res.rowCount >= 1 && res.rows.some((r: any) => r.client_code === 'CL00108'),
  },

  // TEST 11: Retrieve orders without corresponding trades
  {
    id: 11,
    name: 'Retrieve orders without corresponding trades',
    plan: {
      table: 'v3_order_details_equity',
      joins: [
        {
          table: 'v3_trade_details_equity',
          type: 'LEFT',
        },
      ],
      filters: [
        {
          table: 'v3_trade_details_equity',
          field: 'trade_reference',
          operator: 'IS NULL',
        },
      ],
      selectedFields: ['order_reference', 'client_code', 'order_status', 'order_stock_code', 'order_quantity'],
    },
    expectSuccess: true,
    validate: (res) => res.rowCount === 305,
  },

  // TEST 12: Bulk search using [CL00101, CL00105, CL00110]
  {
    id: 12,
    name: 'Bulk search using [CL00101, CL00105, CL00110]',
    plan: {
      table: 'v3_client_details',
      filters: [
        {
          field: 'client_code',
          operator: 'IN',
          value: ['CL00101', 'CL00105', 'CL00110'],
        },
      ],
      selectedFields: ['client_code', 'client_pan_number', 'customer_type_individual_huf'],
    },
    expectSuccess: true,
    validate: (res) =>
      res.rowCount === 3 &&
      res.rows.map((r: any) => r.client_code).sort().join(',') === 'CL00101,CL00105,CL00110',
  },

  // TEST 13: Return only selected output fields
  {
    id: 13,
    name: 'Return only selected output fields (client_code, trade_date, trade_reference, trade_value)',
    plan: {
      table: 'v3_trade_details_equity',
      selectedFields: ['client_code', 'trade_date', 'trade_reference', 'trade_value'],
      limit: 5,
    },
    expectSuccess: true,
    validate: (res) => {
      const cols = Object.keys(res.rows[0]);
      return cols.length === 4 && cols.sort().join(',') === 'client_code,trade_date,trade_reference,trade_value';
    },
  },

  // TEST 14: Three-way Client -> Order -> Trade join
  {
    id: 14,
    name: 'Three-way Client -> Order -> Trade join',
    plan: {
      table: 'v3_client_details',
      joins: [
        { table: 'v3_order_details_equity', type: 'INNER' },
        { table: 'v3_trade_details_equity', type: 'INNER' },
      ],
      selectedFields: [
        'client_code',
        'customer_type_individual_huf',
        'order_reference',
        'trade_reference',
        'trade_stock_code',
        'trade_value',
      ],
      limit: 5,
    },
    expectSuccess: true,
    validate: (res) =>
      res.rowCount === 5 &&
      res.columns.includes('client_code') &&
      res.columns.includes('order_reference') &&
      res.columns.includes('trade_reference'),
  },

  // TEST 15: Reject an invalid table
  {
    id: 15,
    name: 'Reject an invalid table',
    plan: {
      table: 'non_existent_table',
    },
    expectSuccess: false,
    validate: (res) => !res.success && res.error?.includes('Invalid table'),
  },

  // TEST 16: Reject an invalid column
  {
    id: 16,
    name: 'Reject an invalid column',
    plan: {
      table: 'v3_client_details',
      selectedFields: ['non_existent_column'],
    },
    expectSuccess: false,
    validate: (res) => !res.success && res.error?.includes('does not exist'),
  },

  // TEST 17: Reject an invalid join
  {
    id: 17,
    name: 'Reject an invalid join (Address to Order directly)',
    plan: {
      table: 'v3_user_address_details',
      joins: [{ table: 'v3_order_details_equity' }],
    },
    expectSuccess: false,
    validate: (res) => !res.success && res.error?.includes('Unapproved join'),
  },

  // TEST 18: Reject an UPDATE statement
  {
    id: 18,
    name: 'Reject an UPDATE statement',
    plan: {
      table: 'v3_client_details',
      filters: [
        {
          field: 'client_code',
          operator: '=',
          value: "CL00101'; UPDATE v3_client_details SET client_code='HACKED'; --",
        },
      ],
    },
    expectSuccess: false,
    validate: (res) => !res.success && (res.error?.includes('Dangerous pattern') || res.error?.includes('injection')),
  },

  // TEST 19: Reject a DELETE statement
  {
    id: 19,
    name: 'Reject a DELETE statement',
    plan: {
      table: 'v3_client_details',
      filters: [
        {
          field: 'client_code',
          operator: '=',
          value: "CL00101'; DELETE FROM v3_client_details; --",
        },
      ],
    },
    expectSuccess: false,
    validate: (res) => !res.success && (res.error?.includes('Dangerous pattern') || res.error?.includes('injection')),
  },
];

async function runAllTests() {
  console.log('='.repeat(60));
  console.log('AIU V3 QUERY ENGINE AUTOMATED TEST SUITE (19 TEST SCENARIOS)');
  console.log('='.repeat(60));

  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    const res = await executeV3QueryPlan(t.plan);
    const successMatches = res.success === t.expectSuccess;
    let customValid = true;
    if (t.validate) {
      customValid = t.validate(res);
    }

    if (successMatches && customValid) {
      passed++;
      const rowInfo = res.success ? `(${res.rowCount} rows in ${res.queryMetadata.executionTimeMs}ms)` : `(Rejected: ${res.error?.slice(0, 45)}...)`;
      console.log(`[PASS] TEST ${t.id.toString().padStart(2, '0')}: ${t.name} -> ${rowInfo}`);
    } else {
      failed++;
      console.error(`[FAIL] TEST ${t.id.toString().padStart(2, '0')}: ${t.name}`);
      console.error('       Result:', res);
    }
  }

  console.log('='.repeat(60));
  console.log(`FINAL RESULTS: ${passed} PASSED / ${failed} FAILED (Total: ${tests.length})`);
  console.log('='.repeat(60));

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
