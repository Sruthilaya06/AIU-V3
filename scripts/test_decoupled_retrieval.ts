// scripts/test_decoupled_retrieval.ts
// Automated test verifying decoupling of Single Search and Bulk Search from Natural Language requirement.

import { buildDeterministicV3Plan } from '../src/server/v3/deterministicLookupPlanner';
import { executeV3QueryPlan } from '../src/server/v3/queryEngine';
import { validateV3QueryPlan } from '../src/server/v3/queryValidator';

async function testSingleDeterministic() {
  console.log('\n--- 1. Testing Single Search (Deterministic, No NL Prompt) ---');
  const plan = buildDeterministicV3Plan({
    searchMode: 'single',
    identifierType: 'client_code',
    singleIdentifier: 'CL00101',
    selectedFields: ['client_code', 'trade_reference', 'trade_date', 'trade_value'],
  });

  const val = validateV3QueryPlan(plan);
  if (!val.valid) {
    throw new Error(`Plan validation failed: ${val.error}`);
  }

  const result = await executeV3QueryPlan(plan);
  if (!result.success) {
    throw new Error(`Execution failed: ${result.error}`);
  }

  console.log(`Executed successfully. Returned ${result.rows.length} rows.`);
  const sample = result.rows[0];
  console.log('Sample row:', sample);

  if (!sample.client_code || !sample.trade_reference || !sample.trade_date || sample.trade_value === undefined) {
    throw new Error('Missing expected fields in returned row');
  }

  if (typeof sample.trade_value !== 'number' || sample.trade_value <= 0) {
    throw new Error(`Invalid trade_value: ${sample.trade_value}`);
  }

  console.log('✅ Single Search returned actual trade_value and individual trade records.');
}

async function testBulkDeterministic() {
  console.log('\n--- 2. Testing Bulk Search (Deterministic, No NL Prompt) ---');
  const uploadedClients = ['CL00101', 'CL00105', 'CL00110'];
  const plan = buildDeterministicV3Plan({
    searchMode: 'bulk',
    bulkIdentifiers: uploadedClients,
    selectedFields: ['client_code', 'trade_reference', 'trade_date', 'trade_value'],
  });

  const val = validateV3QueryPlan(plan);
  if (!val.valid) {
    throw new Error(`Bulk plan validation failed: ${val.error}`);
  }

  const result = await executeV3QueryPlan(plan);
  if (!result.success) {
    throw new Error(`Bulk execution failed: ${result.error}`);
  }

  console.log(`Executed successfully. Returned ${result.rows.length} rows.`);
  const distinctClients = Array.from(new Set(result.rows.map((r: any) => r.client_code)));
  console.log('Distinct clients found in results:', distinctClients);

  // Verify only the uploaded clients are present
  for (const client of distinctClients) {
    if (!uploadedClients.includes(client)) {
      throw new Error(`Unexpected client ${client} found in bulk results`);
    }
  }

  // Verify trade_value is present as raw individual values, not replaced by trade_count
  const sample = result.rows[0];
  console.log('Sample row from bulk:', sample);

  if (!sample.client_code || !sample.trade_reference || !sample.trade_date || sample.trade_value === undefined) {
    throw new Error('Bulk search result missing trade_value or trade_reference');
  }

  if (typeof sample.trade_value !== 'number') {
    throw new Error('trade_value is not numeric');
  }

  console.log('Generated SQL for Bulk Search:');
  console.log(result.queryMetadata.sqlGenerated);

  console.log('✅ Bulk Search successfully returned actual trade values for only the requested clients.');
}

async function runAll() {
  console.log('======================================================================');
  console.log('AIU V3.1 DECOUPLED RETRIEVAL VERIFICATION TEST');
  console.log('======================================================================');

  await testSingleDeterministic();
  await testBulkDeterministic();

  console.log('\n======================================================================');
  console.log('ALL DECOUPLED RETRIEVAL TESTS PASSED SUCCESSFULLY');
  console.log('======================================================================\n');
}

runAll().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
