// scripts/test_single_search_and_data_types.ts
// Comprehensive automated test suite verifying:
// 1. Single search direct retrieval without natural language
// 2. Computed Trade Metrics (Trade Count, Total Trade Value, Avg Trade Value, Peak Trade Value)
// 3. Confirmation that Total Trade Value uses Trade Details.trade_value
// 4. Form Number and Mobile Number treated as TEXT identifiers
// 5. PAN, Client Code, Form Number, Phone lookup paths
// 6. Bulk Search decoupling and multi-identifier execution

import { buildDeterministicV3Plan } from '../src/server/v3/deterministicLookupPlanner';
import { executeV3QueryPlan } from '../src/server/v3/queryEngine';
import { validateV3QueryPlan } from '../src/server/v3/queryValidator';
import { V3_TABLES } from '../src/lib/v3_schema';

async function runTests() {
  console.log('================================================================');
  console.log('AIU V3.1 — VERIFYING SINGLE SEARCH DIRECT RETRIEVAL & DATA TYPES');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, msg: string) {
    total++;
    if (condition) {
      console.log(`[PASS] ${msg}`);
      passed++;
    } else {
      console.error(`[FAIL] ${msg}`);
      throw new Error(`Assertion failed: ${msg}`);
    }
  }

  // 1. Schema check: Form Number and Mobile Number are TEXT
  console.log('--- TEST 1: Schema Types Check ---');
  const clientCols = V3_TABLES.v3_client_details.columns;
  const formNumCol = clientCols.find(c => c.dbName === 'form_number');
  assert(formNumCol?.dataType === 'TEXT', 'v3_client_details.form_number has dataType TEXT');

  const addrCols = V3_TABLES.v3_user_address_details.columns;
  const mobileCol = addrCols.find(c => c.dbName === 'user_mobile_number');
  assert(mobileCol?.dataType === 'TEXT', 'v3_user_address_details.user_mobile_number has dataType TEXT');

  // 2. Single Search: Client Code CL00101 + Total Trade Value (EMPTY NL requirement)
  console.log('\n--- TEST 2: Single Search CL00101 + Total Trade Value ---');
  const plan1 = buildDeterministicV3Plan({
    searchMode: 'single',
    identifierType: 'client_code',
    singleIdentifier: 'CL00101',
    selectedFields: ['client_code', 'total_trade_value'],
  });

  const val1 = validateV3QueryPlan(plan1);
  assert(val1.valid, 'Plan 1 validates with queryValidator');
  const res1 = await executeV3QueryPlan(plan1);
  assert(res1.success, 'Plan 1 executes successfully');
  assert(res1.rowCount === 1, 'Returns exactly 1 aggregated row for CL00101');
  assert(res1.rows[0].client_code === 'CL00101', 'Row client_code is CL00101');
  assert(typeof res1.rows[0].total_trade_value === 'number' && res1.rows[0].total_trade_value > 0, `Total trade value computed: ${res1.rows[0].total_trade_value}`);
  console.log('Result Row:', res1.rows[0]);

  // 3. Single Search: Client Code CL00101 + all 5 metrics
  console.log('\n--- TEST 3: Single Search CL00101 + 5 values (Code, Count, Total, Avg, Highest) ---');
  const plan2 = buildDeterministicV3Plan({
    searchMode: 'single',
    identifierType: 'client_code',
    singleIdentifier: 'CL00101',
    selectedFields: [
      'client_code',
      'trade_count',
      'total_trade_value',
      'avg_trade_value',
      'max_trade_value',
    ],
  });

  const val2 = validateV3QueryPlan(plan2);
  assert(val2.valid, 'Plan 2 validates with queryValidator');
  const res2 = await executeV3QueryPlan(plan2);
  assert(res2.success, 'Plan 2 executes successfully');
  assert(res2.rowCount === 1, 'Returns exactly 1 aggregated row');
  const r2 = res2.rows[0];
  assert(r2.client_code === 'CL00101', 'client_code is CL00101');
  assert(r2.trade_count === 44, `trade_count is 44 (got ${r2.trade_count})`);
  assert(r2.total_trade_value === 15052865, `total_trade_value is 15052865 (got ${r2.total_trade_value})`);
  assert(r2.max_trade_value === 1482740, `max_trade_value is 1482740 (got ${r2.max_trade_value})`);
  assert(Math.round(r2.avg_trade_value) === 342111, `avg_trade_value is ~342111 (got ${r2.avg_trade_value})`);
  console.log('5 values result:', r2);

  // 4. Single Search: Non-trade client fields
  console.log('\n--- TEST 4: Single Search Non-Trade Fields (Client + PAN + Form + Verification) ---');
  const plan3 = buildDeterministicV3Plan({
    searchMode: 'single',
    identifierType: 'client_code',
    singleIdentifier: 'CL00101',
    selectedFields: ['client_code', 'client_pan_number', 'form_number', 'client_verify_status'],
  });

  const val3 = validateV3QueryPlan(plan3);
  assert(val3.valid, 'Plan 3 validates');
  const res3 = await executeV3QueryPlan(plan3);
  assert(res3.success, 'Plan 3 executes successfully');
  assert(res3.rowCount === 1, 'Returns exactly 1 client row');
  assert(res3.rows[0].client_code === 'CL00101', 'Client code matches');
  assert(res3.rows[0].client_pan_number === 'ABCDE1001F', 'PAN is ABCDE1001F');
  assert(String(res3.rows[0].form_number) === '1000000001', 'Form number is 1000000001');
  console.log('Client row:', res3.rows[0]);

  // 5. Single Search: Client fields joined with user personal and address fields
  console.log('\n--- TEST 5: Single Search User + Address Joined Fields ---');
  const plan4 = buildDeterministicV3Plan({
    searchMode: 'single',
    identifierType: 'client_code',
    singleIdentifier: 'CL00101',
    selectedFields: ['client_code', 'user_first_name', 'user_email', 'user_mobile_number', 'user_city'],
  });

  const val4 = validateV3QueryPlan(plan4);
  assert(val4.valid, 'Plan 4 validates');
  const res4 = await executeV3QueryPlan(plan4);
  assert(res4.success, 'Plan 4 executes successfully');
  assert(res4.rowCount === 1, 'Returns exactly 1 joined row');
  assert(res4.rows[0].user_first_name && res4.rows[0].user_email, 'First name and email present');
  console.log('Joined user row:', res4.rows[0]);

  // 6. Single Search by PAN: ABCDE1001F + Total Trade Value
  console.log('\n--- TEST 6: Single Search by PAN ABCDE1001F + Total Trade Value ---');
  const plan5 = buildDeterministicV3Plan({
    searchMode: 'single',
    identifierType: 'pan',
    singleIdentifier: 'ABCDE1001F',
    selectedFields: ['client_code', 'total_trade_value'],
  });

  const val5 = validateV3QueryPlan(plan5);
  assert(val5.valid, 'Plan 5 validates');
  const res5 = await executeV3QueryPlan(plan5);
  assert(res5.success, 'Plan 5 executes successfully');
  assert(res5.rowCount === 1, 'Returns exactly 1 row');
  assert(res5.rows[0].client_code === 'CL00101', 'Resolves to CL00101 via PAN');
  assert(res5.rows[0].total_trade_value === 15052865, 'Calculates trade value via PAN');
  console.log('PAN lookup result:', res5.rows[0]);

  // 7. Single Search by Form Number: '1000000001' (treated as TEXT) + Total Trade Value
  console.log('\n--- TEST 7: Single Search by Form Number 1000000001 + Total Trade Value ---');
  const plan6 = buildDeterministicV3Plan({
    searchMode: 'single',
    identifierType: 'form_number',
    singleIdentifier: '1000000001',
    selectedFields: ['client_code', 'total_trade_value'],
  });

  const val6 = validateV3QueryPlan(plan6);
  assert(val6.valid, 'Plan 6 validates');
  const res6 = await executeV3QueryPlan(plan6);
  assert(res6.success, 'Plan 6 executes successfully');
  assert(res6.rowCount === 1, 'Returns exactly 1 row');
  assert(res6.rows[0].client_code === 'CL00101', 'Resolves to CL00101 via form_number');
  assert(res6.rows[0].total_trade_value === 15052865, 'Calculates trade value via form_number');
  console.log('Form number lookup result:', res6.rows[0]);

  // 8. Single Search by Mobile Number: '9820000001' (treated as TEXT) + Total Trade Value
  console.log('\n--- TEST 8: Single Search by Mobile Number 9820000001 + Total Trade Value ---');
  const plan7 = buildDeterministicV3Plan({
    searchMode: 'single',
    identifierType: 'phone',
    singleIdentifier: '9820000001',
    selectedFields: ['client_code', 'total_trade_value'],
  });

  const val7 = validateV3QueryPlan(plan7);
  assert(val7.valid, 'Plan 7 validates');
  const res7 = await executeV3QueryPlan(plan7);
  assert(res7.success, 'Plan 7 executes successfully');
  assert(res7.rowCount === 1, 'Returns exactly 1 row');
  assert(res7.rows[0].client_code === 'CL00101', 'Resolves to CL00101 via phone');
  assert(res7.rows[0].total_trade_value === 15052865, 'Calculates trade value via phone');
  console.log('Phone lookup result:', res7.rows[0]);

  // 9. Bulk Search: CL00101, CL00102 + Total Trade Value (No Natural Language)
  console.log('\n--- TEST 9: Bulk Search CL00101, CL00102 + Total Trade Value ---');
  const plan8 = buildDeterministicV3Plan({
    searchMode: 'bulk',
    identifierType: 'client_code',
    bulkIdentifiers: ['CL00101', 'CL00102'],
    selectedFields: ['client_code', 'trade_count', 'total_trade_value'],
  });

  const val8 = validateV3QueryPlan(plan8);
  assert(val8.valid, 'Plan 8 validates');
  const res8 = await executeV3QueryPlan(plan8);
  assert(res8.success, 'Plan 8 executes successfully');
  assert(res8.rowCount === 2, `Returns 2 clients (got ${res8.rowCount})`);
  console.log('Bulk Search result rows:', res8.rows);

  console.log(`\n================================================================`);
  console.log(`ALL TESTS PASSED: ${passed}/${total}`);
  console.log(`================================================================`);
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
