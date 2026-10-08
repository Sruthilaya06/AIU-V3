// src/lib/fileParser.ts
// Multi-sheet Excel and multi-delimiter TXT file parser for AIU Bulk Search

import * as XLSX from 'xlsx';

export interface ParsedFileInfo {
  fileName: string;
  fileType: string;
  rowCount: number;
  columns: string[];
  rows: Record<string, any>[];
  sheets?: string[];
  selectedSheet?: string;
  detectedDelimiter?: string;
  rawWorkbook?: any; // XLSX workbook reference for instant sheet switching
  rawTextContent?: string; // Raw text content for delimiter switching
}

/**
 * Detect delimiter in text files: comma, tab, pipe, or semicolon
 */
export function detectTextDelimiter(textContent: string): string {
  const lines = textContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return ',';

  const sample = lines.slice(0, 5).join('\n');
  const counts = {
    '\t': (sample.match(/\t/g) || []).length,
    ',': (sample.match(/,/g) || []).length,
    '|': (sample.match(/\|/g) || []).length,
    ';': (sample.match(/;/g) || []).length,
  };

  let bestDelimiter = ',';
  let maxCount = 0;

  for (const [delim, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      bestDelimiter = delim;
    }
  }

  return bestDelimiter;
}

export function getDelimiterName(delimiter: string): string {
  switch (delimiter) {
    case '\t':
      return 'TAB';
    case ',':
      return 'COMMA';
    case '|':
      return 'PIPE';
    case ';':
      return 'SEMICOLON';
    default:
      return 'CUSTOM';
  }
}

/**
 * Parses a specific worksheet from an existing workbook
 */
export function parseSheetData(workbook: any, sheetName: string): { columns: string[]; rows: Record<string, any>[] } {
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    throw new Error(`Sheet '${sheetName}' not found in workbook.`);
  }

  const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  if (rawJson.length === 0) {
    return { columns: [], rows: [] };
  }

  const columns = Object.keys(rawJson[0]);
  return { columns, rows: rawJson };
}

/**
 * Parses raw text using specified delimiter
 */
export function parseTextWithDelimiter(
  textContent: string,
  delimiter: string
): { columns: string[]; rows: Record<string, any>[] } {
  // Use XLSX or line-by-line parsing
  const lines = textContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return { columns: [], rows: [] };
  }

  // Header row
  const headers = lines[0].split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, ''));
  const rows: Record<string, any>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(delimiter).map((p) => p.trim().replace(/^["']|["']$/g, ''));
    const rowObj: Record<string, any> = {};
    headers.forEach((h, hIdx) => {
      rowObj[h] = parts[hIdx] ?? '';
    });
    rows.push(rowObj);
  }

  return { columns: headers, rows };
}

/**
 * Primary parser for uploaded files (CSV, XLSX, XLS, TXT)
 */
export async function parseUploadedFile(file: File): Promise<ParsedFileInfo> {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';

  if (!['csv', 'xlsx', 'xls', 'txt'].includes(extension)) {
    throw new Error(
      `Unsupported file extension '.${extension}'. Please upload a CSV, Excel (.xlsx, .xls) or TXT file.`
    );
  }

  const buffer = await file.arrayBuffer();

  if (extension === 'csv' || extension === 'txt') {
    const textDecoder = new TextDecoder('utf-8');
    const textContent = textDecoder.decode(buffer);

    if (!textContent.trim()) {
      throw new Error('The uploaded file is empty. Please provide a valid data file.');
    }

    const detectedDelimiter = detectTextDelimiter(textContent);
    const { columns, rows } = parseTextWithDelimiter(textContent, detectedDelimiter);

    if (rows.length === 0) {
      throw new Error('No data rows found in the uploaded file.');
    }

    return {
      fileName: file.name,
      fileType: extension.toUpperCase(),
      rowCount: rows.length,
      columns,
      rows,
      detectedDelimiter,
      rawTextContent: textContent,
    };
  }

  // Excel binary (.xlsx, .xls)
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheets = workbook.SheetNames;

  if (sheets.length === 0) {
    throw new Error('The Excel workbook contains no sheets.');
  }

  const selectedSheet = sheets[0];
  const { columns, rows } = parseSheetData(workbook, selectedSheet);

  if (rows.length === 0) {
    throw new Error(`The sheet '${selectedSheet}' contains no data rows.`);
  }

  return {
    fileName: file.name,
    fileType: extension.toUpperCase(),
    rowCount: rows.length,
    columns,
    rows,
    sheets,
    selectedSheet,
    rawWorkbook: workbook,
  };
}

/**
 * Validates whether the selected input column values appear consistent with the Search Type
 */
export function validateColumnCompatibility(
  searchType: string,
  columnName: string,
  sampleRows: Record<string, any>[]
): { compatible: boolean; warning?: string } {
  if (sampleRows.length === 0) return { compatible: true };

  const samples = sampleRows
    .slice(0, 15)
    .map((r) => String(r[columnName] ?? '').trim())
    .filter(Boolean);

  if (samples.length === 0) {
    return {
      compatible: false,
      warning: `The selected column '${columnName}' has empty values in the first sample rows.`,
    };
  }

  if (searchType === 'mobile') {
    const digitSamples = samples.filter((s) => /^\+?\d[\d\s-]{8,14}\d$/.test(s));
    if (digitSamples.length < samples.length * 0.5) {
      return {
        compatible: false,
        warning: `Notice: Values in '${columnName}' don't look like phone numbers (e.g. "${samples[0]}"). Ensure you selected the correct column.`,
      };
    }
  }

  if (searchType === 'form_number') {
    const numericSamples = samples.filter((s) => /^\d+(\.0+)?$/.test(s));
    if (numericSamples.length < samples.length * 0.5) {
      return {
        compatible: false,
        warning: `Notice: Values in '${columnName}' do not appear to be numeric Form Numbers (e.g. "${samples[0]}").`,
      };
    }
  }

  return { compatible: true };
}
