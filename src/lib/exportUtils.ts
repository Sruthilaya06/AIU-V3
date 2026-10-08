// src/lib/exportUtils.ts
// Utility for exporting AIU retrieval results to CSV, Excel (.xlsx), and Tab-Delimited TXT

import * as XLSX from 'xlsx';

export type ExportFormat = 'csv' | 'excel' | 'txt';

export function getExportFilename(prefix: string, extension: string): string {
  const dateStr = new Date().toISOString().split('T')[0];
  const cleanPrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${cleanPrefix}_${dateStr}.${extension}`;
}

/**
 * Download arbitrary Blob to client with given filename
 */
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Export data array to CSV format
 */
export function exportToCSV(
  rows: Record<string, any>[],
  headers: { key: string; label: string }[],
  filename: string
): void {
  if (rows.length === 0) {
    const csvContent = headers.map((h) => `"${h.label.replace(/"/g, '""')}"`).join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(blob, filename);
    return;
  }

  const headerLine = headers.map((h) => `"${h.label.replace(/"/g, '""')}"`).join(',');
  const rowLines = rows.map((row) =>
    headers
      .map((h) => {
        const val = row[h.key] ?? '';
        const clean = String(val).replace(/"/g, '""');
        return `"${clean}"`;
      })
      .join(',')
  );

  const csvContent = [headerLine, ...rowLines].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename);
}

/**
 * Export data array to Excel (.xlsx) using SheetJS
 */
export function exportToExcel(
  rows: Record<string, any>[],
  headers: { key: string; label: string }[],
  filename: string
): void {
  // Format rows with friendly labels as object keys
  const formattedData = rows.map((row) => {
    const obj: Record<string, any> = {};
    headers.forEach((h) => {
      obj[h.label] = row[h.key] ?? '';
    });
    return obj;
  });

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'AIU_Retrieval');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerDownload(blob, filename);
}

/**
 * Export data array to tab-delimited TXT format
 */
export function exportToTXT(
  rows: Record<string, any>[],
  headers: { key: string; label: string }[],
  filename: string
): void {
  const headerLine = headers.map((h) => h.label).join('\t');
  const rowLines = rows.map((row) =>
    headers.map((h) => String(row[h.key] ?? '')).join('\t')
  );

  const txtContent = [headerLine, ...rowLines].join('\n');
  const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' });
  triggerDownload(blob, filename);
}

/**
 * Unified export dispatcher
 */
export function exportResults(
  format: ExportFormat,
  rows: Record<string, any>[],
  headers: { key: string; label: string }[],
  filenamePrefix: string
): void {
  const ext = format === 'excel' ? 'xlsx' : format;
  const filename = getExportFilename(filenamePrefix, ext);

  if (format === 'csv') {
    exportToCSV(rows, headers, filename);
  } else if (format === 'excel') {
    exportToExcel(rows, headers, filename);
  } else if (format === 'txt') {
    exportToTXT(rows, headers, filename);
  }
}
