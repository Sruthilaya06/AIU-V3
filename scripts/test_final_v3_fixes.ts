// scripts/test_final_v3_fixes.ts
// Comprehensive end-to-end verification of:
// - Single Search Modes A, B, C
// - Context-aware NL in Single Search
// - Conflict detection between identifier field and NL query
// - Total trade value SUM(trade_value) producing exactly 1 row
// - Differentiating trade_value vs total trade value
// - Form Number and Mobile Number formatted as plain text identifiers
// - Bulk search with NL
// - Export text formatting preservation

import { buildDeterministicV3Plan } from '../src/server/v3/deterministicLookupPlanner';
import { planNaturalLanguageQuery } from '../src/server/v3/nlQueryPlanner';
import { executeV3QueryPlan } from '../src/server/v3/queryEngine';
import { validateV3QueryPlan } from '../src/server/v3/queryValidator';
import { formatV3FieldValue, getFieldDisplayType } from '../src/components/v3/v3FieldCatalog';

async function simulateServerEndpoint(body: {
  searchMode: 'single' | 'bulk' | 'natural-language';
  identifierType?: 'client_code' | 'pan' | 'form_number' | 'phone';
  singleIdentifier?: string;
  bulkIdentifiers?: string[];
  requirement?: string;
  selectedFields?: string[];
}) {
  const {
    searchMode,
    identifierType = 'client_code',
    singleIdentifier,
    bulkIdentifiers,
    requirement,
    selectedFields = ['client_code'],
  } = body;

  const hasNLRequirement = Boolean(requirement && typeof requirement === 'string' && requirement.trim());
  let plan: any;

  const cleanId = (raw: string, type?: string): string => {
    const trimmed = String(raw).trim();
    if (type === 'phone') return trimmed.replace(/[\s-]/g, '');
    if (type === 'form_number') return trimmed;
    return trimmed.toUpperCase();
  };

  const validFields = Array.isArray(selectedFields) && selectedFields.length > 0
    ? selectedFields
    : ['client_code'];

  const computedMetricAliases = new Set([
    'trade_count',
    'total_trade_value',
    'avg_trade_value',
    'max_trade_value',
    'min_trade_value',
    'latest_trade_date',
  ]);

  if (searchMode === 'single') {
    if (!singleIdentifier || !String(singleIdentifier).trim()) {
      return { success: false, error: 'Single Search requires a valid identifier.' };
    }

    const targetClient = cleanId(singleIdentifier, identifierType);

    if (!hasNLRequirement) {
      plan = buildDeterministicV3Plan({
        searchMode: 'single',
        identifierType,
        singleIdentifier: targetClient,
        selectedFields: validFields,
      });
    } else {
      const nlClientCodes = requirement!.match(/\bCL\d{5}\b/gi)?.map((c) => c.toUpperCase()) || [];
      const conflicting = nlClientCodes.find((c) => c !== targetClient.toUpperCase());
      if (conflicting) {
        return {
          success: false,
          error: `Client Code conflict: the Single Search identifier is ${targetClient} but the query mentions ${conflicting}. Please use the same client code.`,
        };
      }

      const plannerResult = await planNaturalLanguageQuery(requirement!);
      if (!plannerResult.success || !plannerResult.plan) {
        return { success: false, error: plannerResult.error || 'Failed to formulate plan' };
      }

      plan = { ...plannerResult.plan };

      const idCol = identifierType === 'form_number'
        ? 'form_number'
        : identifierType === 'phone'
        ? 'user_mobile_number'
        : identifierType === 'pan'
        ? 'client_pan_number'
        : 'client_code';

      plan.filters = (plan.filters || []).filter((f: any) => f.field !== idCol && f.field !== 'client_code');
      plan.filters.push({ field: idCol, operator: '=', value: targetClient });

      if (plan.aggregations && plan.aggregations.length > 0) {
        plan.groupBy = ['client_code'];
        plan.selectedFields = ['client_code'];
        plan.limit = undefined;
      } else {
        if (Array.isArray(selectedFields) && selectedFields.length > 0) {
          const physicalSelected = selectedFields.filter((f) => !computedMetricAliases.has(f));
          if (physicalSelected.length > 0) {
            plan.selectedFields = physicalSelected;
          }
        }
      }
    }
  } else if (searchMode === 'bulk') {
    if (!Array.isArray(bulkIdentifiers) || bulkIdentifiers.length === 0) {
      return { success: false, error: 'Bulk Search requires uploaded identifiers.' };
    }

    const validBulk = bulkIdentifiers.map((id) => cleanId(String(id), identifierType));

    if (!hasNLRequirement) {
      plan = buildDeterministicV3Plan({
        searchMode: 'bulk',
        identifierType,
        bulkIdentifiers: validBulk,
        selectedFields: validFields,
      });
    } else {
      const plannerResult = await planNaturalLanguageQuery(requirement!);
      if (!plannerResult.success || !plannerResult.plan) {
        return { success: false, error: plannerResult.error };
      }

      plan = { ...plannerResult.plan };
      const idCol = identifierType === 'form_number'
        ? 'form_number'
        : identifierType === 'phone'
        ? 'user_mobile_number'
        : identifierType === 'pan'
        ? 'client_pan_number'
        : 'client_code';

      plan.filters = (plan.filters || []).filter((f: any) => f.field !== idCol && f.field !== 'client_code');
      plan.filters.push({ field: idCol, operator: 'IN', value: validBulk });

      if (plan.aggregations && plan.aggregations.length > 0) {
        plan.groupBy = ['client_code'];
        plan.selectedFields = ['client_code'];
        plan.limit = undefined;
      } else {
        const hasExplicitLimit = /\b(?:top|last|latest|limit|first)\s+\d+\b/i.test(requirement!);
        if (!hasExplicitLimit) {
          plan.limit = undefined;
        } else if (/\b(?:for\s+(?:each|every|all)\s+client)\b/i.test(requirement!)) {
          const perClientLimit = parseInt(requirement!.match(/\b(?:top|last|latest|limit|first)\s+(\d+)\b/i)?.[1] || '5', 10);
          plan.limit = validBulk.length * perClientLimit;
        }
      }
    }
  }

  const val = validateV3QueryPlan(plan);
  if (!val.valid) {
    return { success: false, error: `Query Validation Error: ${val.error}` };
  }

  const result = await executeV3QueryPlan(plan);
  return { success: true, plan, result };
}

async function runAllTests() {
  console.log('================================================================');
  console.log('AIU V3.1 — VERIFYING ALL 12 USER TEST CASES + CONFLICT HANDLING');
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
      throw new Error(`Failed: ${msg}`);
    }
  }

  // TEST 1 — Deterministic client lookup
  console.log('--- TEST 1: Deterministic client lookup (CL00101, NL empty) ---');
  const t1 = await simulateServerEndpoint({
    searchMode: 'single',
    singleIdentifier: 'CL00101',
    selectedFields: ['client_code', 'form_number', 'user_mobile_number'],
  });
  assert(t1.success, 'Test 1 executed');
  assert(t1.result?.rowCount === 1, 'Returns 1 client row');
  const r1 = t1.result?.rows[0];
  assert(r1.client_code === 'CL00101', 'Client code is CL00101');
  assert(typeof r1.form_number === 'string', 'form_number is returned as STRING');
  assert(typeof r1.user_mobile_number === 'string', 'user_mobile_number is returned as STRING');
  assert(formatV3FieldValue('form_number', r1.form_number) === '1000000001', 'Form number formatted as plain text');
  assert(!formatV3FieldValue('form_number', r1.form_number).includes('₹'), 'Form number has no currency symbol');
  assert(!formatV3FieldValue('form_number', r1.form_number).includes(','), 'Form number has no commas');
  assert(formatV3FieldValue('user_mobile_number', r1.user_mobile_number) === '9820000001', 'Mobile number formatted as plain text');
  assert(!formatV3FieldValue('user_mobile_number', r1.user_mobile_number).includes('₹'), 'Mobile number has no currency symbol');
  assert(!formatV3FieldValue('user_mobile_number', r1.user_mobile_number).includes(','), 'Mobile number has no commas');
  console.log('Row 1:', r1);

  // TEST 2 — Total trade value for CL00104
  console.log('\n--- TEST 2: Total trade value for CL00104 ("Give me the total trade value for the given client code.") ---');
  const t2 = await simulateServerEndpoint({
    searchMode: 'single',
    singleIdentifier: 'CL00104',
    requirement: 'Give me the total trade value for the given client code.',
  });
  assert(t2.success, 'Test 2 executed');
  assert(t2.result?.rowCount === 1, 'Exactly ONE row returned');
  const r2 = t2.result?.rows[0];
  assert(r2.client_code === 'CL00104', 'client_code is CL00104');
  assert(typeof r2.total_trade_value === 'number' && r2.total_trade_value > 0, `total_trade_value is numeric: ${r2.total_trade_value}`);
  assert(formatV3FieldValue('total_trade_value', r2.total_trade_value).startsWith('₹'), 'Total trade value formatted with ₹');
  console.log('Row 2:', r2, 'Formatted:', formatV3FieldValue('total_trade_value', r2.total_trade_value));

  // TEST 3 — Total trade value with different wording
  console.log('\n--- TEST 3: Overall value of trades for this client ("What is the overall value of trades for this client?") ---');
  const t3 = await simulateServerEndpoint({
    searchMode: 'single',
    singleIdentifier: 'CL00104',
    requirement: 'What is the overall value of trades for this client?',
  });
  assert(t3.success, 'Test 3 executed');
  assert(t3.result?.rowCount === 1, 'Exactly ONE row returned');
  const r3 = t3.result?.rows[0];
  assert(r3.client_code === 'CL00104', 'client_code is CL00104');
  assert(r3.total_trade_value === r2.total_trade_value, `Matches Test 2 value: ${r3.total_trade_value}`);
  console.log('Row 3:', r3);

  // TEST 4 — Trade count
  console.log('\n--- TEST 4: Trade count ("How many trades did this client make?") ---');
  const t4 = await simulateServerEndpoint({
    searchMode: 'single',
    singleIdentifier: 'CL00104',
    requirement: 'How many trades did this client make?',
  });
  assert(t4.success, 'Test 4 executed');
  assert(t4.result?.rowCount === 1, 'Exactly ONE row returned');
  const r4 = t4.result?.rows[0];
  assert(r4.client_code === 'CL00104', 'client_code is CL00104');
  assert(typeof r4.trade_count === 'number' && r4.trade_count > 0, `trade_count is: ${r4.trade_count}`);
  console.log('Row 4:', r4);

  // TEST 5 — Average trade value
  console.log('\n--- TEST 5: Average trade value ("What is the average trade value for this client?") ---');
  const t5 = await simulateServerEndpoint({
    searchMode: 'single',
    singleIdentifier: 'CL00104',
    requirement: 'What is the average trade value for this client?',
  });
  assert(t5.success, 'Test 5 executed');
  assert(t5.result?.rowCount === 1, 'Exactly ONE row returned');
  const r5 = t5.result?.rows[0];
  assert(r5.client_code === 'CL00104', 'client_code is CL00104');
  assert(typeof r5.avg_trade_value === 'number', `avg_trade_value is: ${r5.avg_trade_value}`);
  console.log('Row 5:', r5);

  // TEST 6 — Highest trade value
  console.log('\n--- TEST 6: Highest trade value ("What was the highest trade value for this client?") ---');
  const t6 = await simulateServerEndpoint({
    searchMode: 'single',
    singleIdentifier: 'CL00104',
    requirement: 'What was the highest trade value for this client?',
  });
  assert(t6.success, 'Test 6 executed');
  assert(t6.result?.rowCount === 1, 'Exactly ONE row returned');
  const r6 = t6.result?.rows[0];
  assert(r6.client_code === 'CL00104', 'client_code is CL00104');
  assert(typeof r6.max_trade_value === 'number', `max_trade_value is: ${r6.max_trade_value}`);
  console.log('Row 6:', r6);

  // TEST 7 — Latest 5 trades
  console.log('\n--- TEST 7: Latest 5 trades ("Show the last 5 trades for this client.") ---');
  const t7 = await simulateServerEndpoint({
    searchMode: 'single',
    singleIdentifier: 'CL00104',
    requirement: 'Show the last 5 trades for this client.',
  });
  assert(t7.success, 'Test 7 executed');
  assert(t7.result?.rowCount === 5, 'Exactly 5 rows returned');
  assert(t7.result?.rows.every((row: any) => row.client_code === 'CL00104'), 'All rows belong to CL00104');
  console.log('Sample trade row:', t7.result?.rows[0]);

  // TEST 8 — Selected fields without NL
  console.log('\n--- TEST 8: Selected fields without NL (CL00104, Trade Reference, Trade Date, Trade Value) ---');
  const t8 = await simulateServerEndpoint({
    searchMode: 'single',
    singleIdentifier: 'CL00104',
    selectedFields: ['trade_reference', 'trade_date', 'trade_value'],
  });
  assert(t8.success, 'Test 8 executed');
  assert(t8.result?.rowCount! > 5, 'Returns raw trade records for CL00104');
  assert(t8.result?.columns.includes('trade_reference'), 'Columns include trade_reference');
  assert(t8.result?.columns.includes('trade_date'), 'Columns include trade_date');
  assert(t8.result?.columns.includes('trade_value'), 'Columns include trade_value');
  console.log('Returned rows count:', t8.result?.rowCount);

  // TEST 9 & 10 — Form Number & Mobile Number formatting
  console.log('\n--- TEST 9 & 10: Form Number & Mobile Number identifier formatting rules ---');
  assert(getFieldDisplayType('form_number') === 'identifier', 'form_number displayType is identifier');
  assert(getFieldDisplayType('user_mobile_number') === 'identifier', 'user_mobile_number displayType is identifier');
  assert(formatV3FieldValue('form_number', '0010000001') === '0010000001', 'Preserves leading zeros on form_number');
  assert(formatV3FieldValue('user_mobile_number', '09820000001') === '09820000001', 'Preserves leading zeros on mobile number');
  assert(formatV3FieldValue('form_number', 1000000001) === '1000000001', 'No commas on numeric form number');
  assert(formatV3FieldValue('user_mobile_number', 9876543210) === '9876543210', 'No commas on numeric mobile number');

  // TEST 11 — Bulk search with NL
  console.log('\n--- TEST 11: Bulk search ("Give me the total trade value for each client.") ---');
  const t11 = await simulateServerEndpoint({
    searchMode: 'bulk',
    bulkIdentifiers: ['CL00101', 'CL00105', 'CL00110'],
    requirement: 'Give me the total trade value for each client.',
  });
  assert(t11.success, 'Test 11 executed');
  assert(t11.result?.rowCount === 3, 'Exactly 3 rows returned (one per client)');
  const clientSet = new Set(t11.result?.rows.map((r: any) => r.client_code));
  assert(clientSet.has('CL00101') && clientSet.has('CL00105') && clientSet.has('CL00110'), 'All 3 uploaded clients present');
  console.log('Bulk rows:', t11.result?.rows);

  // TEST 12 — Bulk latest trades
  console.log('\n--- TEST 12: Bulk latest trades ("Show the last 5 trades for each client.") ---');
  const t12 = await simulateServerEndpoint({
    searchMode: 'bulk',
    bulkIdentifiers: ['CL00101', 'CL00105', 'CL00110'],
    requirement: 'Show the last 5 trades for each client.',
  });
  assert(t12.success, 'Test 12 executed');
  assert(t12.result?.rowCount! <= 15, 'At most 15 rows returned');
  console.log('Bulk trades row count:', t12.result?.rowCount);

  // CONFLICT TEST — Single Search identifier CL00104 with NL query for CL00105
  console.log('\n--- CONFLICT TEST: Identifier CL00104 vs query mentioning CL00105 ---');
  const tConflict = await simulateServerEndpoint({
    searchMode: 'single',
    singleIdentifier: 'CL00104',
    requirement: 'Give me the total trade value for CL00105.',
  });
  assert(!tConflict.success, 'Conflict correctly refused');
  assert(
    tConflict.error?.includes('Client Code conflict'),
    `Error message contains conflict notice: "${tConflict.error}"`
  );
  console.log('Conflict error returned as expected:', tConflict.error);

  console.log(`\n================================================================`);
  console.log(`ALL 12 TESTS + CONFLICT TEST PASSED: ${passed}/${total}`);
  console.log(`================================================================`);
}

runAllTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
