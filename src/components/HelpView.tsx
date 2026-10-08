// src/components/HelpView.tsx
// Auditor Guidance & Sample Templates for AIU Data Retrieval

import React from 'react';
import {
  HelpCircle,
  FileSpreadsheet,
  Search,
  Download,
  CheckCircle,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { exportToCSV, exportToExcel } from '../lib/exportUtils';

export const HelpView: React.FC<{ onNavigateToRetrieval: () => void }> = ({
  onNavigateToRetrieval,
}) => {
  const downloadSampleTemplate = (type: 'mobile' | 'client_code' | 'form_number', format: 'csv' | 'excel') => {
    let rows: any[] = [];
    let headers: { key: string; label: string }[] = [];

    if (type === 'mobile') {
      headers = [
        { key: 'Audit Ref', label: 'Audit Ref' },
        { key: 'Mobile Number', label: 'Mobile Number' },
        { key: 'Branch', label: 'Branch' },
      ];
      rows = [
        { 'Audit Ref': 'AUD-001', 'Mobile Number': '9820123401', Branch: 'Mumbai North' },
        { 'Audit Ref': 'AUD-002', 'Mobile Number': '9820123402', Branch: 'Pune Central' },
        { 'Audit Ref': 'AUD-003', 'Mobile Number': '9820123403', Branch: 'Nagpur East' },
        { 'Audit Ref': 'AUD-004', 'Mobile Number': '9820123404', Branch: 'Nashik Main' },
      ];
    } else if (type === 'client_code') {
      headers = [
        { key: 'Docket ID', label: 'Docket ID' },
        { key: 'Client Code', label: 'Client Code' },
        { key: 'Inspector Name', label: 'Inspector Name' },
      ];
      rows = [
        { 'Docket ID': 'DOC-101', 'Client Code': 'CL00101', 'Inspector Name': 'Audit Team A' },
        { 'Docket ID': 'DOC-102', 'Client Code': 'CL00102', 'Inspector Name': 'Audit Team A' },
        { 'Docket ID': 'DOC-103', 'Client Code': 'CL00103', 'Inspector Name': 'Audit Team B' },
        { 'Docket ID': 'DOC-104', 'Client Code': 'CL00104', 'Inspector Name': 'Audit Team B' },
      ];
    } else {
      headers = [
        { key: 'Batch No', label: 'Batch No' },
        { key: 'Form Number', label: 'Form Number' },
        { key: 'Region', label: 'Region' },
      ];
      rows = [
        { 'Batch No': 'B-501', 'Form Number': '1000000001', Region: 'West' },
        { 'Batch No': 'B-502', 'Form Number': '1000000002', Region: 'West' },
        { 'Batch No': 'B-503', 'Form Number': '1000000003', Region: 'North' },
        { 'Batch No': 'B-504', 'Form Number': '1000000004', Region: 'South' },
      ];
    }

    const filename = `AIU_Sample_Input_${type}_Template.${format === 'excel' ? 'xlsx' : 'csv'}`;
    if (format === 'csv') {
      exportToCSV(rows, headers, filename);
    } else {
      exportToExcel(rows, headers, filename);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Auditor User Guide &amp; Templates</h2>
            <p className="text-xs text-slate-500">
              Complete workflow instructions and sample input files for the AIU Data Retrieval system.
            </p>
          </div>
        </div>
      </div>

      {/* Guide Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Single Search Guide */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 text-blue-700 font-bold text-sm pb-2 border-b border-slate-100">
            <Search className="w-4 h-4" />
            <span>Single Search Workflow</span>
          </div>

          <ol className="text-xs text-slate-600 space-y-2.5 list-decimal pl-4 leading-relaxed">
            <li>
              <strong className="text-slate-800">Choose Search By:</strong> Select whether you are searching with a Mobile Number, Client Code, or Form Number.
            </li>
            <li>
              <strong className="text-slate-800">Enter Search Value:</strong> Provide the 10-digit mobile, client code, or numeric form number.
            </li>
            <li>
              <strong className="text-slate-800">Select Output Fields:</strong> Pick the exact business columns you want to view and export (e.g. Client Code, PAN, First Name, Mobile, Account Status).
            </li>
            <li>
              <strong className="text-slate-800">Review &amp; Export:</strong> Preview the retrieved record and click Download CSV, Excel, or TXT.
            </li>
          </ol>
        </div>

        {/* Bulk Search Guide */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 text-indigo-700 font-bold text-sm pb-2 border-b border-slate-100">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Bulk Search Workflow</span>
          </div>

          <ol className="text-xs text-slate-600 space-y-2.5 list-decimal pl-4 leading-relaxed">
            <li>
              <strong className="text-slate-800">Upload Data File:</strong> Choose any CSV, Excel (.xlsx, .xls) or tab-delimited TXT file containing hundreds of client identifiers.
            </li>
            <li>
              <strong className="text-slate-800">Map Input Column:</strong> Select which column in your file holds the identifier (e.g. "Mobile", "Client Code").
            </li>
            <li>
              <strong className="text-slate-800">Pick Output Fields:</strong> Select the required data attributes.
            </li>
            <li>
              <strong className="text-slate-800">Batch Processing &amp; Export:</strong> The engine automatically normalizes, deduplicates, and resolves matches, with one-click export for All, Matched, or Unmatched rows.
            </li>
          </ol>
        </div>
      </div>

      {/* Download Sample Templates Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
          <Download className="w-4 h-4 text-blue-600" />
          <span>Download Sample Test Files</span>
        </h3>
        <p className="text-xs text-slate-500">
          Use these pre-formatted sample input files to test bulk retrieval immediately.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* Sample 1: Mobile */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <div className="text-xs font-bold text-slate-800">Mobile Numbers Sample</div>
            <p className="text-[11px] text-slate-500">Contains 4 valid mobile numbers for testing.</p>
            <div className="flex space-x-2 pt-1">
              <button
                onClick={() => downloadSampleTemplate('mobile', 'csv')}
                className="px-2 py-1 bg-white border border-slate-200 hover:bg-blue-50 text-slate-700 rounded text-xs font-medium"
              >
                CSV
              </button>
              <button
                onClick={() => downloadSampleTemplate('mobile', 'excel')}
                className="px-2 py-1 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 rounded text-xs font-medium"
              >
                Excel (.xlsx)
              </button>
            </div>
          </div>

          {/* Sample 2: Client Code */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <div className="text-xs font-bold text-slate-800">Client Codes Sample</div>
            <p className="text-[11px] text-slate-500">Contains CL00101 - CL00104 identifiers.</p>
            <div className="flex space-x-2 pt-1">
              <button
                onClick={() => downloadSampleTemplate('client_code', 'csv')}
                className="px-2 py-1 bg-white border border-slate-200 hover:bg-blue-50 text-slate-700 rounded text-xs font-medium"
              >
                CSV
              </button>
              <button
                onClick={() => downloadSampleTemplate('client_code', 'excel')}
                className="px-2 py-1 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 rounded text-xs font-medium"
              >
                Excel (.xlsx)
              </button>
            </div>
          </div>

          {/* Sample 3: Form Number */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <div className="text-xs font-bold text-slate-800">Form Numbers Sample</div>
            <p className="text-[11px] text-slate-500">Contains 1000000001 - 1000000004.</p>
            <div className="flex space-x-2 pt-1">
              <button
                onClick={() => downloadSampleTemplate('form_number', 'csv')}
                className="px-2 py-1 bg-white border border-slate-200 hover:bg-blue-50 text-slate-700 rounded text-xs font-medium"
              >
                CSV
              </button>
              <button
                onClick={() => downloadSampleTemplate('form_number', 'excel')}
                className="px-2 py-1 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 rounded text-xs font-medium"
              >
                Excel (.xlsx)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
