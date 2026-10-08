// src/lib/v3FileParser.ts
// Dedicated File Parser for AIU V3 Bulk Search
// Supports CSV, TXT, Excel (.xlsx, .xls)
// Deduplicates, validates identifiers, produces audit preview metrics

import * as XLSX from 'xlsx';

export interface V3FileParseResult {
  fileName: string;
  fileType: 'CSV' | 'TXT' | 'EXCEL' | 'UNSUPPORTED';
  totalRows: number;
  validIdentifiers: string[];
  duplicateCount: number;
  invalidCount: number;
  invalidIdentifiers: string[];
  samplePreview: string[];
  error?: string;
}

/**
 * Validates whether a token looks like a supported AIU identifier.
 * Client Code: CL followed by 5 digits (e.g. CL00101)
 * Form Number: 10 digits
 * Phone: 10 digits
 */
export function validateV3Identifier(
  raw: string,
  type: 'client_code' | 'pan' | 'form_number' | 'phone' = 'client_code'
): boolean {
  const val = String(raw).trim();
  if (!val) return false;

  if (type === 'client_code') {
    return /^CL\d{3,6}$/i.test(val);
  }
  if (type === 'pan') {
    return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(val);
  }
  if (type === 'form_number') {
    return /^\d{8,12}$/.test(val);
  }
  if (type === 'phone') {
    const clean = val.replace(/[\s-]/g, '');
    return /^\d{10}$/.test(clean);
  }
  return false;
}

export async function parseV3BulkFile(
  file: File,
  identifierType: 'client_code' | 'pan' | 'form_number' | 'phone' = 'client_code'
): Promise<V3FileParseResult> {
  const fileName = file.name;
  const ext = fileName.split('.').pop()?.toLowerCase();

  let fileType: 'CSV' | 'TXT' | 'EXCEL' | 'UNSUPPORTED' = 'UNSUPPORTED';
  if (ext === 'csv') fileType = 'CSV';
  else if (ext === 'txt') fileType = 'TXT';
  else if (ext === 'xlsx' || ext === 'xls') fileType = 'EXCEL';

  if (fileType === 'UNSUPPORTED') {
    return {
      fileName,
      fileType,
      totalRows: 0,
      validIdentifiers: [],
      duplicateCount: 0,
      invalidCount: 0,
      invalidIdentifiers: [],
      samplePreview: [],
      error: 'Unsupported file format. Please upload a CSV, TXT, or Excel (.xlsx/.xls) file.',
    };
  }

  try {
    const buffer = await file.arrayBuffer();
    const rawValues: string[] = [];

    if (fileType === 'TXT') {
      const text = new TextDecoder('utf-8').decode(buffer);
      const lines = text.split(/[\r\n,;\t]+/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) {
          rawValues.push(trimmed);
        }
      }
    } else {
      // Excel or CSV via XLSX parser
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        throw new Error('Workbook contains no sheets.');
      }
      const sheet = workbook.Sheets[firstSheetName];
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      for (const row of rows) {
        if (!Array.isArray(row)) continue;
        for (const cell of row) {
          if (cell !== undefined && cell !== null && String(cell).trim()) {
            rawValues.push(String(cell).trim());
          }
        }
      }
    }

    if (rawValues.length === 0) {
      return {
        fileName,
        fileType,
        totalRows: 0,
        validIdentifiers: [],
        duplicateCount: 0,
        invalidCount: 0,
        invalidIdentifiers: [],
        samplePreview: [],
        error: 'The uploaded file is empty or contains no readable text.',
      };
    }

    // Deduplicate and categorize
    const validSet = new Set<string>();
    const seenAll = new Set<string>();
    const invalidList: string[] = [];
    let duplicateCount = 0;

    for (const raw of rawValues) {
      // Check if header row
      if (/^(?:client_code|client\s*code|pan|pan_number|form_number|phone|mobile|identifier|id|sr_no|no)$/i.test(raw)) {
        continue;
      }

      const upper = raw.toUpperCase();
      if (seenAll.has(upper)) {
        duplicateCount++;
        continue;
      }
      seenAll.add(upper);

      if (validateV3Identifier(raw, identifierType)) {
        validSet.add(upper);
      } else {
        invalidList.push(raw);
      }
    }

    const validIdentifiers = Array.from(validSet);

    return {
      fileName,
      fileType,
      totalRows: seenAll.size + duplicateCount,
      validIdentifiers,
      duplicateCount,
      invalidCount: invalidList.length,
      invalidIdentifiers: invalidList.slice(0, 10),
      samplePreview: validIdentifiers.slice(0, 5),
    };
  } catch (err: any) {
    return {
      fileName,
      fileType,
      totalRows: 0,
      validIdentifiers: [],
      duplicateCount: 0,
      invalidCount: 0,
      invalidIdentifiers: [],
      samplePreview: [],
      error: `Failed to read file: ${err.message || 'Unknown parser error'}`,
    };
  }
}
