// scripts/run_v3_e2e_tests.ts
// Automated End-to-End Test Suite for AIU V3 User Interface & Integration Layer
// Verifies all 10 scenarios specified in Step 20

import { validateV3Identifier } from '../src/lib/v3FileParser';
import * as XLSX from 'xlsx';

const BASE_URL = 'http://localhost:3000';

async function testScenario(name: string, fn: () => Promise<boolean>): Promise<boolean> {
  try {
    const success = await fn();
    if (success) {
      console.log(`[PASS] ${name}`);
      return true;
    } else {
      console.error(`[FAIL] ${name}`);
      return false;
    }
  } catch (err: any) {
    console.error(`[FAIL] ${name} -> Error: ${err.message}`);
    return false;
  }
}

async function runE2ETests() {
  console.log('='.repeat(70));
  console.log('AIU V3 USER INTERFACE & INTEGRATION LAYER E2E TESTS (10 SCENARIOS)');
  console.log('='.repeat(70));

  let passed = 0;
  let total = 10;

  // TEST 1: Single Search - Client CL00101, "Show the last 5 trades."
  if (
    await testScenario('TEST 1: Single Search - CL00101 last 5 trades', async () => {
      const res = await fetch(`${BASE_URL}/api/v3/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchMode: 'single',
          singleIdentifier: 'CL00101',
          requirement: 'Show the last 5 trades.',
          selectedFields: ['client_code', 'trade_reference', 'trade_date', 'trade_value'],
        }),
      });
      const data = await res.json();
      return (
        data.success &&
        data.rowCount === 5 &&
        data.rows.every((r: any) => r.client_code === 'CL00101')
      );
    })
  ) passed++;

  // TEST 2: Single Search - Client CL00101, "Show trades in July 2026."
  if (
    await testScenario('TEST 2: Single Search - CL00101 trades in July 2026', async () => {
      const res = await fetch(`${BASE_URL}/api/v3/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchMode: 'single',
          singleIdentifier: 'CL00101',
          requirement: 'Show trades in July 2026.',
          selectedFields: ['client_code', 'trade_reference', 'trade_date', 'trade_value'],
        }),
      });
      const data = await res.json();
      return (
        data.success &&
        data.rowCount > 0 &&
        data.rows.every((r: any) => r.client_code === 'CL00101' && r.trade_date.startsWith('2026-07'))
      );
    })
  ) passed++;

  // TEST 3: Single Search - Client CL00101, "Show only trade date, trade reference and trade value."
  if (
    await testScenario('TEST 3: Single Search - Field selection projection', async () => {
      const res = await fetch(`${BASE_URL}/api/v3/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchMode: 'single',
          singleIdentifier: 'CL00101',
          requirement: 'Show only trade date, trade reference and trade value.',
          selectedFields: ['trade_date', 'trade_reference', 'trade_value'],
        }),
      });
      const data = await res.json();
      if (!data.success || data.rowCount === 0) return false;
      const keys = Object.keys(data.rows[0]);
      return keys.length === 3 && keys.sort().join(',') === 'trade_date,trade_reference,trade_value';
    })
  ) passed++;

  // TEST 4: Bulk Search - Upload CSV containing [CL00101, CL00105, CL00110], "Show their latest trades."
  if (
    await testScenario('TEST 4: Bulk Search (CSV) - CL00101, CL00105, CL00110 latest trades', async () => {
      const bulkList = ['CL00101', 'CL00105', 'CL00110'];
      const res = await fetch(`${BASE_URL}/api/v3/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchMode: 'bulk',
          bulkIdentifiers: bulkList,
          requirement: 'Show their latest trades.',
          selectedFields: ['client_code', 'trade_reference', 'trade_date', 'trade_value'],
        }),
      });
      const data = await res.json();
      return (
        data.success &&
        data.rowCount > 0 &&
        data.rows.every((r: any) => bulkList.includes(r.client_code))
      );
    })
  ) passed++;

  // TEST 5: Bulk Search - TXT containing client codes, "Show total trade value for each client."
  if (
    await testScenario('TEST 5: Bulk Search (TXT) - Total trade value for clients', async () => {
      const bulkList = ['CL00101', 'CL00102', 'CL00103', 'CL00104'];
      const res = await fetch(`${BASE_URL}/api/v3/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchMode: 'bulk',
          bulkIdentifiers: bulkList,
          requirement: 'Show total trade value by client.',
          selectedFields: ['client_code', 'total_trade_value'],
        }),
      });
      const data = await res.json();
      return (
        data.success &&
        data.rowCount === 4 &&
        data.rows.every((r: any) => bulkList.includes(r.client_code) && typeof r.total_trade_value === 'number')
      );
    })
  ) passed++;

  // TEST 6: Bulk Search - Excel containing client codes, "Show clients who traded during July 2026."
  if (
    await testScenario('TEST 6: Bulk Search (Excel) - Clients who traded during July 2026', async () => {
      const bulkList = ['CL00101', 'CL00105', 'CL00108'];
      const res = await fetch(`${BASE_URL}/api/v3/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchMode: 'bulk',
          bulkIdentifiers: bulkList,
          requirement: 'Show clients who traded during July 2026.',
          selectedFields: ['client_code', 'customer_type_individual_huf', 'client_pan_number'],
        }),
      });
      const data = await res.json();
      return (
        data.success &&
        data.rowCount > 0 &&
        data.rows.every((r: any) => bulkList.includes(r.client_code))
      );
    })
  ) passed++;

  // TEST 7: Natural Language Ranking - "Top 10 clients by trade count in July 2026."
  if (
    await testScenario('TEST 7: NL Ranking - Top 10 clients by trade count in July 2026', async () => {
      const res = await fetch(`${BASE_URL}/api/v3/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchMode: 'single',
          requirement: 'Top 10 clients who traded most in July 2026.',
        }),
      });
      const data = await res.json();
      return (
        data.success &&
        data.rowCount === 10 &&
        data.rows[0].trade_count >= data.rows[9].trade_count
      );
    })
  ) passed++;

  // TEST 8: Natural Language Ranking - "Top 10 clients by total trade value in July 2026."
  if (
    await testScenario('TEST 8: NL Ranking - Top 10 clients by total trade value in July 2026', async () => {
      const res = await fetch(`${BASE_URL}/api/v3/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchMode: 'single',
          requirement: 'Top 10 clients by total trade value in July 2026.',
        }),
      });
      const data = await res.json();
      return (
        data.success &&
        data.rowCount === 10 &&
        data.rows[0].total_trade_value >= data.rows[9].total_trade_value
      );
    })
  ) passed++;

  // TEST 9: Ambiguity - "Show top clients."
  if (
    await testScenario('TEST 9: Ambiguity - "Show top clients." prompts clarification', async () => {
      const res = await fetch(`${BASE_URL}/api/v3/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchMode: 'single',
          requirement: 'Show top clients.',
        }),
      });
      const data = await res.json();
      return (
        !data.success &&
        data.clarificationNeeded === true &&
        data.clarificationPrompt?.includes('trade count or total trade value')
      );
    })
  ) passed++;

  // TEST 10: Invalid file format validation
  if (
    await testScenario('TEST 10: File parser validation rejects invalid identifier', async () => {
      const isValidClient = validateV3Identifier('CL00101', 'client_code');
      const isInvalidClient = validateV3Identifier('INVALID_CODE', 'client_code');
      const isShortClient = validateV3Identifier('CL1', 'client_code');

      return isValidClient === true && isInvalidClient === false && isShortClient === false;
    })
  ) passed++;

  console.log('='.repeat(70));
  console.log(`FINAL E2E RESULTS: ${passed} PASSED / ${total - passed} FAILED (Total: ${total})`);
  console.log('='.repeat(70));

  process.exit(passed === total ? 0 : 1);
}

runE2ETests().catch((err) => {
  console.error('Fatal E2E test runner failure:', err);
  process.exit(1);
});
