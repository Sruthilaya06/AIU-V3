// src/lib/v3ExportUtils.ts
// Dedicated Export Utilities for AIU V3
// Exports ONLY the caller's selected output fields
// Strictly preserves identifier fields as plain strings without scientific notation or numeric coercion

import * as XLSX from 'xlsx';
import { getFieldDisplayType } from '../components/v3/v3FieldCatalog';

/**
 * Triggers a browser download of a given blob.
 */
function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Filters rows to only the requested selected fields and enforces STRING data types on identifier fields.
 */
function prepareExportRows(rows: any[], selectedFields: string[]): { data: any[]; headers: string[] } {
  if (!rows || rows.length === 0) return { data: [], headers: [] };

  const headers = selectedFields && selectedFields.length > 0 ? selectedFields : Object.keys(rows[0] || {});

  const data = rows.map((row) => {
    const item: Record<string, any> = {};
    for (const h of headers) {
      const rawVal = row[h];
      if (rawVal === undefined || rawVal === null) {
        item[h] = '';
        continue;
      }

      const displayType = getFieldDisplayType(h);
      if (displayType === 'identifier') {
        // Enforce exact string to preserve leading zeros and prevent scientific notation
        item[h] = String(rawVal);
      } else {
        item[h] = rawVal;
      }
    }
    return item;
  });

  return { data, headers };
}

/**
 * Export results as CSV.
 */
export function exportV3ToCSV(rows: any[], selectedFields: string[], baseFileName: string = 'aiu_v3_export'): void {
  const { data, headers } = prepareExportRows(rows, selectedFields);
  const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
  const csvOutput = XLSX.utils.sheet_to_csv(worksheet);

  const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
  const timeStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  downloadBlob(blob, `${baseFileName}_${timeStr}.csv`);
}

/**
 * Export results as Excel (.xlsx).
 * Explicitly marks identifier columns as text cells (t: 's') so Excel never converts to scientific notation.
 */
export function exportV3ToExcel(rows: any[], selectedFields: string[], baseFileName: string = 'aiu_v3_export'): void {
  const { data, headers } = prepareExportRows(rows, selectedFields);
  const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });

  // Post-process cells in the worksheet: ensure identifier columns are typed as string ('s')
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const colHeader = headers[C];
    if (colHeader && getFieldDisplayType(colHeader) === 'identifier') {
      for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = worksheet[cellAddress];
        if (cell && cell.v !== undefined && cell.v !== null) {
          cell.t = 's';
          cell.v = String(cell.v);
          cell.z = '@';
        }
      }
    }
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'AIU_V3_Results');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const timeStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  downloadBlob(blob, `${baseFileName}_${timeStr}.xlsx`);
}

/**
 * Export results as tab-delimited TXT.
 */
export function exportV3ToTXT(rows: any[], selectedFields: string[], baseFileName: string = 'aiu_v3_export'): void {
  const { data, headers } = prepareExportRows(rows, selectedFields);

  const lines: string[] = [headers.join('\t')];
  for (const row of data) {
    const line = headers.map((h) => (row[h] !== undefined && row[h] !== null ? String(row[h]) : '')).join('\t');
    lines.push(line);
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
  const timeStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  downloadBlob(blob, `${baseFileName}_${timeStr}.txt`);
}
