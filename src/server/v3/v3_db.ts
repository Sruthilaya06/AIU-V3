// src/server/v3/v3_db.ts
// AIU V3 Isolated Database Access Layer
// Runs on sql.js over data/v3_aiu.db
// Strictly isolated from V2 functionality

import initSqlJs, { Database, QueryExecResult } from 'sql.js';
import fs from 'fs';
import path from 'path';

let dbInstance: Database | null = null;
let initPromise: Promise<Database> | null = null;

const DB_FILE_PATH = path.resolve(process.cwd(), 'data', 'v3_aiu.db');

/**
 * Initializes and returns the isolated V3 database instance.
 */
export async function getV3Database(): Promise<Database> {
  if (dbInstance) return dbInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const SQL = await initSqlJs();
    if (!fs.existsSync(DB_FILE_PATH)) {
      throw new Error(`V3 Database file not found at ${DB_FILE_PATH}. Run scripts/build_and_seed_v3_db.py first.`);
    }
    const fileBuffer = fs.readFileSync(DB_FILE_PATH);
    dbInstance = new SQL.Database(fileBuffer);
    return dbInstance;
  })();

  return initPromise;
}

export interface QueryResultRow {
  [column: string]: any;
}

export interface V3QueryResult {
  columns: string[];
  rows: QueryResultRow[];
  rowCount: number;
  executionTimeMs: number;
}

const IDENTIFIER_COLS = new Set([
  'form_number',
  'user_mobile_number',
  'user_telephone_number',
  'user_office_number',
  'client_code',
  'client_pan_number',
  'user_id',
  'order_reference',
  'trade_reference',
  'trade_order_reference',
]);

/**
 * Executes a read-only SQL query against the V3 database.
 */
export async function executeV3Query(sqlQuery: string): Promise<V3QueryResult> {
  const startTime = performance.now();
  const db = await getV3Database();

  const results: QueryExecResult[] = db.exec(sqlQuery);
  const executionTimeMs = Math.round((performance.now() - startTime) * 100) / 100;

  if (!results || results.length === 0) {
    return {
      columns: [],
      rows: [],
      rowCount: 0,
      executionTimeMs,
    };
  }

  const { columns, values } = results[0];
  const rows: QueryResultRow[] = values.map((valRow) => {
    const rowObj: QueryResultRow = {};
    columns.forEach((col, idx) => {
      const val = valRow[idx];
      rowObj[col] = IDENTIFIER_COLS.has(col) && val !== null && val !== undefined ? String(val) : val;
    });
    return rowObj;
  });

  return {
    columns,
    rows,
    rowCount: rows.length,
    executionTimeMs,
  };
}

/**
 * Executes a read-only parameterized SQL query using prepared statement bindings.
 */
export async function executeV3ParameterizedQuery(
  sqlQuery: string,
  params: any[] = []
): Promise<V3QueryResult> {
  const startTime = performance.now();
  const db = await getV3Database();

  const stmt = db.prepare(sqlQuery);
  if (params && params.length > 0) {
    stmt.bind(params);
  }

  const columns = stmt.getColumnNames();
  const rows: QueryResultRow[] = [];
  while (stmt.step()) {
    const rowObj = stmt.getAsObject();
    for (const col of columns) {
      if (IDENTIFIER_COLS.has(col) && rowObj[col] !== null && rowObj[col] !== undefined) {
        rowObj[col] = String(rowObj[col]);
      }
    }
    rows.push(rowObj);
  }

  stmt.free();

  const executionTimeMs = Math.round((performance.now() - startTime) * 100) / 100;

  return {
    columns,
    rows,
    rowCount: rows.length,
    executionTimeMs,
  };
}

/**
 * Returns summary counts for all 7 V3 tables.
 */
export async function getV3TableStats(): Promise<Record<string, number>> {
  const tables = [
    'v3_user_details',
    'v3_user_account_information',
    'v3_user_address_details',
    'v3_user_personal_details',
    'v3_client_details',
    'v3_order_details_equity',
    'v3_trade_details_equity',
  ];

  const stats: Record<string, number> = {};
  for (const tbl of tables) {
    const res = await executeV3Query(`SELECT COUNT(*) as count FROM ${tbl}`);
    stats[tbl] = res.rows[0]?.count || 0;
  }
  return stats;
}
