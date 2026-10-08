// src/components/v3/V3DataRetrieval.tsx
// AIU V3 Retrieval Master Component
// Implements Single & Bulk Search, Natural Language Planning, Output Field Selection,
// Ambiguity Handling, Safe Execution, Traceable Interpretation, Pagination & Multi-Format Exports.
// Completely isolated from V2 functionality.

import React, { useState, useEffect, useId } from 'react';
import {
  Search,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Download,
  Filter,
  Check,
  FileText,
  Clock,
  Layers,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  Info,
  SlidersHorizontal,
  FileCode,
  X,
  History as HistoryIcon,
} from 'lucide-react';

import { V3_ALL_FIELDS, V3_CATEGORIES, V3_DEFAULT_FIELDS, V3CatalogField, formatV3FieldValue } from './v3FieldCatalog';
import { parseV3BulkFile, V3FileParseResult, validateV3Identifier } from '../../lib/v3FileParser';
import { exportV3ToCSV, exportV3ToExcel, exportV3ToTXT } from '../../lib/v3ExportUtils';

type SearchMode = 'single' | 'bulk' | 'natural-language';
type IdentifierType = 'client_code' | 'pan' | 'form_number' | 'phone';

interface V3HistoryItem {
  id: string;
  timestamp: string;
  searchMode: SearchMode;
  requirement: string;
  inputCount: number;
  resultCount: number;
  executionTimeMs: number;
  selectedFields: string[];
}

const V3_HISTORY_KEY = 'aiu_v3_retrieval_history';

export const V3DataRetrieval: React.FC = () => {
  const bulkFileInputId = useId();

  // Search Mode & Identifier Setup
  const [searchMode, setSearchMode] = useState<SearchMode>('single');
  const [identifierType, setIdentifierType] = useState<IdentifierType>('client_code');
  const [singleIdentifier, setSingleIdentifier] = useState<string>('CL00101');
  const [identifierError, setIdentifierError] = useState<string | null>(null);

  // Bulk File State
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkParseResult, setBulkParseResult] = useState<V3FileParseResult | null>(null);
  const [isParsingFile, setIsParsingFile] = useState<boolean>(false);

  // Natural Language Requirement
  const [requirement, setRequirement] = useState<string>('');

  // Output Fields Selection
  const [selectedFields, setSelectedFields] = useState<string[]>(V3_DEFAULT_FIELDS);
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>('trade');

  // Execution & Loading States
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStage, setLoadingStage] = useState<string>('');
  const [executionError, setExecutionError] = useState<string | null>(null);

  // Ambiguity Clarification State
  const [clarificationPrompt, setClarificationPrompt] = useState<string | null>(null);

  // Execution Results
  const [queryResults, setQueryResults] = useState<{
    columns: string[];
    rows: any[];
    rowCount: number;
    queryMetadata: any;
  } | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(50);

  // Local History
  const [history, setHistory] = useState<V3HistoryItem[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);

  // Load history on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(V3_HISTORY_KEY);
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const saveHistory = (item: V3HistoryItem) => {
    try {
      const updated = [item, ...history.slice(0, 19)];
      setHistory(updated);
      localStorage.setItem(V3_HISTORY_KEY, JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  // Validate single identifier as user types
  useEffect(() => {
    if (searchMode === 'single' && singleIdentifier.trim()) {
      if (!validateV3Identifier(singleIdentifier, identifierType)) {
        if (identifierType === 'client_code') {
          setIdentifierError('Client Code format invalid (expected CL followed by 3-6 digits, e.g. CL00101)');
        } else if (identifierType === 'pan') {
          setIdentifierError('PAN format invalid (expected 5 letters, 4 digits, 1 letter, e.g. ABCDE1001F)');
        } else if (identifierType === 'form_number') {
          setIdentifierError('Form Number format invalid (expected 8-12 digits, e.g. 1000000001)');
        } else if (identifierType === 'phone') {
          setIdentifierError('Mobile Number format invalid (expected 10 digits, e.g. 9820000001)');
        } else {
          setIdentifierError('Identifier format invalid');
        }
      } else {
        setIdentifierError(null);
      }
    } else {
      setIdentifierError(null);
    }
  }, [singleIdentifier, identifierType, searchMode]);

  // Smart field suggestions based on requirement string
  useEffect(() => {
    const q = requirement.toLowerCase();
    const suggested: string[] = [];
    if (/client\s*code/i.test(q)) suggested.push('client_code');
    if (/trade\s*date/i.test(q)) suggested.push('trade_date');
    if (/trade\s*reference/i.test(q)) suggested.push('trade_reference');
    if (/trade\s*value/i.test(q)) suggested.push('trade_value');
    if (/(?:trade\s*count|number\s*of\s*trades|traded\s*most)/i.test(q)) suggested.push('trade_count');
    if (/(?:total\s*trade\s*value|sum\s+of\s+trade\s+value)/i.test(q) || (/trade\s*value/i.test(q) && /trade\s*count/i.test(q))) {
      suggested.push('total_trade_value');
    }
    if (/average\s*trade\s*value|avg\s*trade\s*value/i.test(q)) suggested.push('avg_trade_value');
    if (/(?:highest|maximum|max)\s*trade\s*value/i.test(q)) suggested.push('max_trade_value');
    if (/order\s*reference/i.test(q)) suggested.push('order_reference');
    if (/order\s*status/i.test(q)) suggested.push('order_status');
    if (/stock\s*code/i.test(q)) suggested.push('trade_stock_code');
    if (/pan/i.test(q)) suggested.push('client_pan_number');
    if (/email/i.test(q)) suggested.push('user_email');
    if (/phone|mobile/i.test(q)) suggested.push('user_mobile_number');

    if (suggested.length > 0) {
      // Merge unique
      setSelectedFields((prev) => Array.from(new Set([...prev, ...suggested])));
    }
  }, [requirement]);

  // File Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkFile(file);
    setIsParsingFile(true);
    setExecutionError(null);

    try {
      const result = await parseV3BulkFile(file, identifierType);
      setBulkParseResult(result);
      if (result.error) {
        setExecutionError(result.error);
      }
    } catch (err: any) {
      setExecutionError(err.message || 'File parsing failure.');
    } finally {
      setIsParsingFile(false);
    }
  };

  // Field selection toggles
  const handleToggleField = (fieldId: string) => {
    setSelectedFields((prev) =>
      prev.includes(fieldId) ? prev.filter((id) => id !== fieldId) : [...prev, fieldId]
    );
  };

  const handleSelectAllCategory = (catId: string) => {
    const catFields = V3_ALL_FIELDS.filter((f) => f.category === catId).map((f) => f.id);
    setSelectedFields((prev) => Array.from(new Set([...prev, ...catFields])));
  };

  const handleClearCategory = (catId: string) => {
    const catFields = new Set(V3_ALL_FIELDS.filter((f) => f.category === catId).map((f) => f.id));
    setSelectedFields((prev) => prev.filter((id) => !catFields.has(id)));
  };

  // Main Execute Query Pipeline
  const executeQuery = async (overrideRequirement?: string) => {
    const activeReq = (overrideRequirement !== undefined ? overrideRequirement : requirement).trim();

    // Mode-specific validation:
    if (searchMode === 'single') {
      if (!singleIdentifier.trim()) {
        setExecutionError('Please enter a valid identifier (e.g. Client Code CL00101).');
        return;
      }
      if (identifierError) {
        setExecutionError(identifierError);
        return;
      }
    } else if (searchMode === 'bulk') {
      if (!bulkParseResult || bulkParseResult.validIdentifiers.length === 0) {
        setExecutionError('Please upload a valid CSV, TXT, or Excel file with identifiers first.');
        return;
      }
    } else if (searchMode === 'natural-language') {
      if (!activeReq) {
        setExecutionError('Please enter a natural-language retrieval requirement.');
        return;
      }
    }

    if (selectedFields.length === 0) {
      setExecutionError('Please select at least one output field.');
      return;
    }

    setIsLoading(true);
    setExecutionError(null);
    setClarificationPrompt(null);
    setCurrentPage(1);

    // Staged progress feedback for auditor experience
    setLoadingStage('Preparing retrieval...');
    const stageTimer1 = setTimeout(() => setLoadingStage('Preparing data query...'), 250);
    const stageTimer2 = setTimeout(() => setLoadingStage('Retrieving data...'), 600);
    const stageTimer3 = setTimeout(() => setLoadingStage('Preparing results...'), 900);

    try {
      const payload: any = {
        requirement: activeReq,
        searchMode,
        identifierType,
        selectedFields,
      };

      if (searchMode === 'single') {
        if (singleIdentifier.trim()) {
          payload.singleIdentifier = singleIdentifier.trim().toUpperCase();
        }
      } else if (searchMode === 'bulk') {
        payload.bulkIdentifiers = bulkParseResult?.validIdentifiers || [];
      } else if (searchMode === 'natural-language') {
        if (singleIdentifier.trim()) {
          payload.singleIdentifier = singleIdentifier.trim().toUpperCase();
        }
      }

      const res = await fetch('/api/v3/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.clarificationNeeded) {
          setClarificationPrompt(data.clarificationPrompt || 'Requirement is ambiguous. Please clarify.');
        } else {
          setExecutionError(data.error || 'Execution failed.');
        }
        setQueryResults(null);
        return;
      }

      setQueryResults(data);

      // Synchronize selected fields so computed query metrics are preserved
      if (data.columns && Array.isArray(data.columns)) {
        setSelectedFields((prev) => Array.from(new Set([...prev, ...data.columns])));
      }

      // Save to lightweight history
      saveHistory({
        id: `V3_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        searchMode,
        requirement: activeReq || `${searchMode === 'single' ? singleIdentifier : 'Bulk file'} retrieval (${selectedFields.length} fields)`,
        inputCount: searchMode === 'single' ? 1 : bulkParseResult?.validIdentifiers.length || 0,
        resultCount: data.rowCount,
        executionTimeMs: data.queryMetadata.executionTimeMs,
        selectedFields,
      });
    } catch (err: any) {
      setExecutionError(`Network / Server Error: ${err.message || 'Unable to connect to AIU V3 backend'}`);
    } finally {
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      clearTimeout(stageTimer3);
      setIsLoading(false);
      setLoadingStage('');
    }
  };

  // Pagination calculations
  const totalPages = queryResults ? Math.ceil(queryResults.rowCount / rowsPerPage) : 1;
  const paginatedRows = queryResults
    ? queryResults.rows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)
    : [];

  // Export triggers
  const handleExportCSV = () => {
    if (!queryResults || queryResults.rows.length === 0) return;
    exportV3ToCSV(queryResults.rows, queryResults.columns, `aiu_v3_${searchMode}`);
  };

  const handleExportExcel = () => {
    if (!queryResults || queryResults.rows.length === 0) return;
    exportV3ToExcel(queryResults.rows, queryResults.columns, `aiu_v3_${searchMode}`);
  };

  const handleExportTXT = () => {
    if (!queryResults || queryResults.rows.length === 0) return;
    exportV3ToTXT(queryResults.rows, queryResults.columns, `aiu_v3_${searchMode}`);
  };

  return (
    <div className="space-y-6">
      {/* V3 Header & Badge */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3 mb-1.5">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              AIU V3 Engine
            </span>
            <span className="text-xs text-slate-400 font-mono">7 Isolated Relational Tables &bull; SQL-First Retrieval</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            AIU V3 Natural Language &amp; Deterministic Retrieval
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            Controlled Internal Audit Intelligence platform. Translates plain-English requirements into validated SQL Query Plans with complete data lineage.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
          >
            <HistoryIcon className="w-4 h-4 text-blue-400" />
            <span>Query History ({history.length})</span>
          </button>
        </div>
      </div>

      {/* Mode Selector Tabs: Three Completely Independent Search Modes */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-1.5 flex gap-1.5">
        <button
          onClick={() => {
            setSearchMode('single');
            setExecutionError(null);
          }}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-bold text-sm transition-all ${
            searchMode === 'single'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Single Search</span>
        </button>
        <button
          onClick={() => {
            setSearchMode('bulk');
            setExecutionError(null);
          }}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-bold text-sm transition-all ${
            searchMode === 'bulk'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>Bulk Search (File Ingestion)</span>
        </button>
        <button
          onClick={() => {
            setSearchMode('natural-language');
            setExecutionError(null);
          }}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-bold text-sm transition-all ${
            searchMode === 'natural-language'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Natural Language Search</span>
        </button>
      </div>

      {/* Main Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Mode-Specific Inputs */}
        <div className="lg:col-span-7 space-y-6">
          {/* Target Identifier Card (for Single Search or optional client context in NL) */}
          {(searchMode === 'single' || searchMode === 'natural-language') && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-blue-600" />
                    <span>Target Single Identifier</span>
                    {searchMode === 'single' ? (
                      <span className="text-[10px] text-blue-600 font-semibold lowercase">(required for single lookup)</span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-normal lowercase">(optional for population queries)</span>
                    )}
                  </label>
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="text-slate-500">Identifier Type:</span>
                    <select
                      value={identifierType}
                      onChange={(e) => {
                        const newType = e.target.value as IdentifierType;
                        setIdentifierType(newType);
                        if (newType === 'client_code') setSingleIdentifier('CL00101');
                        else if (newType === 'pan') setSingleIdentifier('ABCDE1001F');
                        else if (newType === 'form_number') setSingleIdentifier('1000000001');
                        else if (newType === 'phone') setSingleIdentifier('9820000001');
                      }}
                      className="px-2 py-1 rounded bg-slate-50 border border-slate-300 font-medium text-slate-700 text-xs"
                    >
                      <option value="client_code">Client Code (CL00101)</option>
                      <option value="pan">PAN Number (ABCDE1001F)</option>
                      <option value="form_number">Form Number (1000000001)</option>
                      <option value="phone">Mobile Number (9820000001)</option>
                    </select>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={singleIdentifier}
                    onChange={(e) => setSingleIdentifier(e.target.value.toUpperCase())}
                    placeholder={
                      identifierType === 'client_code'
                        ? searchMode === 'single'
                          ? 'Enter Client Code (e.g. CL00101)'
                          : 'Enter Client Code (e.g. CL00101) — leave blank for population queries'
                        : identifierType === 'pan'
                        ? 'Enter PAN (e.g. ABCDE1001F)'
                        : identifierType === 'form_number'
                        ? 'Enter Form Number (e.g. 1000000001)'
                        : 'Enter Mobile Number (e.g. 9820000001)'
                    }
                    className={`w-full px-4 py-2.5 rounded-lg border font-mono text-sm tracking-wide ${
                      identifierError ? 'border-red-500 focus:ring-red-200' : 'border-slate-300 focus:ring-blue-200'
                    } focus:outline-none focus:ring-2`}
                  />
                  {identifierError && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {identifierError}
                    </p>
                  )}
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] text-slate-500 font-semibold">Presets:</span>
                  {(identifierType === 'pan'
                    ? ['ABCDE1001F', 'ABCDE1002F', 'ABCDE1003F']
                    : identifierType === 'form_number'
                    ? ['1000000001', '1000000002', '1000000003']
                    : identifierType === 'phone'
                    ? ['9820000001', '9820000002', '9820000003']
                    : ['CL00101', 'CL00105', 'CL00108', 'CL00110']
                  ).map((cc) => (
                    <button
                      key={cc}
                      type="button"
                      onClick={() => setSingleIdentifier(cc)}
                      className={`px-2 py-0.5 rounded text-xs font-mono font-bold transition-colors ${
                        singleIdentifier === cc
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      {cc}
                    </button>
                  ))}
                  {singleIdentifier && (
                    <button
                      type="button"
                      onClick={() => setSingleIdentifier('')}
                      className="px-2 py-0.5 rounded text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-dashed border-slate-300 transition-colors ml-auto"
                    >
                      Clear Identifier
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Bulk Upload Card (for Bulk Search) */}
          {searchMode === 'bulk' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
                    <span>Upload Audit Population File</span>
                  </label>
                  <span className="text-[11px] text-slate-500">Formats: CSV, TXT, Excel (.xlsx/.xls)</span>
                </div>

                <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-5 text-center bg-slate-50/50 transition-colors">
                  <FileSpreadsheet className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                  <p className="text-xs font-medium text-slate-700 mb-1">
                    Drag and drop your file here, or{' '}
                    <label htmlFor={bulkFileInputId} className="text-blue-600 font-bold hover:underline cursor-pointer">
                      browse
                    </label>
                  </p>
                  <p className="text-[11px] text-slate-500">Extracts client codes automatically and deduplicates records</p>
                  <input
                    id={bulkFileInputId}
                    type="file"
                    accept=".csv,.txt,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {isParsingFile && (
                  <div className="flex items-center justify-center space-x-2 text-xs text-blue-600 font-semibold py-2">
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Parsing and validating file contents...</span>
                  </div>
                )}

                {/* Bulk File Preview Card */}
                {bulkParseResult && !isParsingFile && (
                  <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span className="font-bold text-xs text-slate-800">{bulkParseResult.fileName}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                          {bulkParseResult.fileType}
                        </span>
                      </div>
                      <span className="text-xs text-emerald-700 font-bold">
                        {bulkParseResult.validIdentifiers.length} Valid Client Codes
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      <div className="p-1.5 rounded bg-white border border-slate-200">
                        <span className="text-[10px] text-slate-500 block">Total Rows</span>
                        <span className="font-bold text-slate-800">{bulkParseResult.totalRows}</span>
                      </div>
                      <div className="p-1.5 rounded bg-emerald-50 border border-emerald-200">
                        <span className="text-[10px] text-emerald-600 block">Valid</span>
                        <span className="font-bold text-emerald-800">{bulkParseResult.validIdentifiers.length}</span>
                      </div>
                      <div className="p-1.5 rounded bg-amber-50 border border-amber-200">
                        <span className="text-[10px] text-amber-600 block">Duplicates</span>
                        <span className="font-bold text-amber-800">{bulkParseResult.duplicateCount}</span>
                      </div>
                      <div className="p-1.5 rounded bg-red-50 border border-red-200">
                        <span className="text-[10px] text-red-600 block">Invalid</span>
                        <span className="font-bold text-red-800">{bulkParseResult.invalidCount}</span>
                      </div>
                    </div>

                    {bulkParseResult.samplePreview.length > 0 && (
                      <div className="text-[11px] text-slate-600">
                        <span className="font-semibold text-slate-700">Preview: </span>
                        {bulkParseResult.samplePreview.join(', ')}
                        {bulkParseResult.validIdentifiers.length > 5 && ' ...'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Natural Language Requirement Card (Optional in Single/Bulk; Mandatory in NL Search) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Auditor Natural Language Requirement</span>
                {searchMode === 'natural-language' ? (
                  <span className="text-[10px] text-blue-600 font-semibold lowercase">(required)</span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-normal lowercase">(optional — leave blank for deterministic lookup)</span>
                )}
              </label>
              <span className="text-[11px] text-slate-500">Deterministic SQL Plan Synthesis</span>
            </div>

            <textarea
              rows={3}
              value={requirement}
              onChange={(e) => setRequirement(e.target.value)}
              placeholder={
                searchMode === 'natural-language'
                  ? 'State your retrieval requirement in plain English (e.g. "Top 10 clients who traded most in July 2026")...'
                  : 'Optional: Enter plain-English requirement, or leave blank to retrieve selected fields directly...'
              }
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 resize-none"
            />

            {/* Quick Audit Templates */}
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">Common Audit Templates:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Show the last 5 trades for this client.',
                  'Top 10 clients who traded most in July 2026.',
                  'Top 10 clients by total trade value in July 2026.',
                  'Show clients who traded from May to June 2026.',
                  'Show clients who traded in May but not June.',
                  'Show orders without corresponding trades.',
                  'Show only client code, trade date and trade value.',
                ].map((tpl) => (
                  <button
                    key={tpl}
                    type="button"
                    onClick={() => {
                      setRequirement(tpl);
                      if (searchMode !== 'natural-language' && !singleIdentifier) {
                        setSearchMode('natural-language');
                      }
                    }}
                    className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium border border-slate-200 transition-colors text-left"
                  >
                    {tpl}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Output Field Selector */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
                  <span>Output Fields Selection</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">{selectedFields.length} fields selected for output</p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedFields(V3_DEFAULT_FIELDS)}
                  className="px-2 py-1 rounded text-[11px] font-medium text-slate-600 hover:bg-slate-100"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Category Sub-tabs */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-lg text-center text-xs">
              {V3_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategoryTab(cat.id)}
                  className={`py-1.5 px-2 rounded-md font-semibold text-[11px] transition-all ${
                    activeCategoryTab === cat.id
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat.label.split(' ')[0]}
                </button>
              ))}
            </div>

            {/* Active Category Actions */}
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-600">
                {V3_CATEGORIES.find((c) => c.id === activeCategoryTab)?.label}
              </span>
              <div className="space-x-2">
                <button
                  type="button"
                  onClick={() => handleSelectAllCategory(activeCategoryTab)}
                  className="text-blue-600 hover:underline font-medium"
                >
                  Select All
                </button>
                <span>&bull;</span>
                <button
                  type="button"
                  onClick={() => handleClearCategory(activeCategoryTab)}
                  className="text-slate-500 hover:underline font-medium"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Field Checkbox List */}
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
              {V3_ALL_FIELDS.filter((f) => f.category === activeCategoryTab).map((field) => {
                const isChecked = selectedFields.includes(field.id);
                return (
                  <label
                    key={field.id}
                    className="flex items-start space-x-2.5 pt-2 cursor-pointer select-none group"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleField(field.id)}
                      className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-semibold text-slate-800 group-hover:text-blue-600">
                          {field.name}
                        </span>
                        {field.isKey && (
                          <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-700">
                            KEY
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block font-mono">{field.id}</span>
                      <p className="text-[11px] text-slate-500 leading-tight">{field.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Ambiguity Clarification Modal/Prompt */}
      {clarificationPrompt && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-3">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <h4 className="font-bold text-sm">Auditor Clarification Required</h4>
          </div>
          <p className="text-xs">{clarificationPrompt}</p>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => {
                setRequirement('Top 10 clients who traded most in July 2026.');
                executeQuery('Top 10 clients who traded most in July 2026.');
              }}
              className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-semibold text-xs hover:bg-amber-700 shadow-xs"
            >
              Rank by Trade Count
            </button>
            <button
              onClick={() => {
                setRequirement('Top 10 clients by total trade value in July 2026.');
                executeQuery('Top 10 clients by total trade value in July 2026.');
              }}
              className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-semibold text-xs hover:bg-amber-700 shadow-xs"
            >
              Rank by Total Trade Value
            </button>
            <button
              onClick={() => setClarificationPrompt(null)}
              className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-800 text-xs font-medium hover:bg-amber-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Execution Error Banner */}
      {executionError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start space-x-3 text-xs">
          <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-sm text-red-900 mb-0.5">Retrieval Execution Refused</h4>
            <p>{executionError}</p>
          </div>
          <button onClick={() => setExecutionError(null)} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Primary Action Button */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          onClick={() => executeQuery()}
          disabled={isLoading}
          className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <RotateCw className="w-4 h-4 animate-spin" />
              <span>{loadingStage || 'Processing Retrieval...'}</span>
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              <span>Execute V3 Retrieval</span>
            </>
          )}
        </button>
      </div>

      {/* Results View Area */}
      {queryResults && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          {/* Header & Metrics */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800">
                  {searchMode.toUpperCase()} AUDIT RUN
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  &bull; {queryResults.rowCount} Records Located
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900">
                {requirement || `${searchMode === 'single' ? `Lookup for ${singleIdentifier}` : 'Bulk Lookup'} (${queryResults.columns.length} columns retrieved)`}
              </h2>
            </div>

            {/* Export Toolbar */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>CSV</span>
              </button>
              <button
                onClick={handleExportExcel}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Excel</span>
              </button>
              <button
                onClick={handleExportTXT}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs"
              >
                <FileText className="w-3.5 h-3.5 text-purple-600" />
                <span>TXT</span>
              </button>
            </div>
          </div>

          {/* Query Transparency Card ("How this search was interpreted") */}
          {queryResults.queryMetadata?.interpretation && (
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between font-bold text-slate-700">
                <span className="flex items-center gap-1.5 text-slate-800">
                  <Info className="w-4 h-4 text-blue-600" />
                  How this search was interpreted:
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  Execution Time: {queryResults.queryMetadata.executionTimeMs} ms
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Primary Table</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {queryResults.queryMetadata.interpretation.primaryTable}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Group By</span>
                  <span className="font-semibold text-slate-800">
                    {queryResults.queryMetadata.interpretation.groupBy || 'None'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Metrics</span>
                  <span className="font-semibold text-blue-700">
                    {queryResults.queryMetadata.interpretation.metrics || queryResults.queryMetadata.interpretation.metric}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Client Filter</span>
                  <span className="font-semibold text-slate-800">
                    {queryResults.queryMetadata.interpretation.clientFilter || 'None'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Period / Date Filter</span>
                  <span className="font-semibold text-slate-800">
                    {queryResults.queryMetadata.interpretation.period}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Ranking &amp; Limit</span>
                  <span className="font-semibold text-slate-800">
                    {queryResults.queryMetadata.interpretation.ranking} (Limit: {queryResults.queryMetadata.interpretation.limit})
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Results Table */}
          {queryResults.rowCount > 0 ? (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2.5 text-left font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                        #
                      </th>
                      {queryResults.columns.map((col) => (
                        <th
                          key={col}
                          className="px-3 py-2.5 text-left font-bold text-slate-600 uppercase tracking-wider text-[10px]"
                        >
                          {col.replace(/_/g, ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100 font-mono">
                    {paginatedRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-3 py-2 text-slate-400 text-[11px]">
                          {(currentPage - 1) * rowsPerPage + idx + 1}
                        </td>
                        {queryResults.columns.map((col) => {
                          const val = row[col];

                          return (
                            <td key={col} className="px-3 py-2 text-slate-700 whitespace-nowrap">
                              {val === null || val === undefined ? (
                                <span className="text-slate-300 italic">-</span>
                              ) : (
                                formatV3FieldValue(col, val)
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-2 pt-1">
                <div className="flex items-center space-x-2">
                  <span>Rows per page:</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-2 py-1 rounded border border-slate-300 bg-white text-xs font-semibold"
                  >
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={500}>500</option>
                  </select>
                  <span>
                    Showing {(currentPage - 1) * rowsPerPage + 1} to{' '}
                    {Math.min(currentPage * rowsPerPage, queryResults.rowCount)} of {queryResults.rowCount}
                  </span>
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded border border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-semibold px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded border border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">
              Zero matching records located for this specific requirement and identifier set.
            </div>
          )}
        </div>
      )}

      {/* Query History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full p-5 space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <HistoryIcon className="w-4 h-4 text-blue-600" />
                V3 Retrieval Audit History
              </h3>
              <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {history.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No previous V3 queries recorded.</p>
              ) : (
                history.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-100/60 transition-colors flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-800">{item.requirement}</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-100 text-blue-800 uppercase">
                          {item.searchMode}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {item.timestamp} &bull; {item.resultCount} rows &bull; {item.executionTimeMs} ms
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setRequirement(item.requirement);
                        setSearchMode(item.searchMode);
                        setSelectedFields(item.selectedFields);
                        setShowHistoryModal(false);
                        executeQuery(item.requirement);
                      }}
                      className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shrink-0"
                    >
                      Rerun
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
