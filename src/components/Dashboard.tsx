// src/components/Dashboard.tsx
// User-oriented auditor Home Page with Single & Bulk Search entry cards and recent retrieval history

import React, { useState, useEffect } from 'react';
import {
  Search,
  FileSpreadsheet,
  ArrowRight,
  Clock,
  ShieldCheck,
  CheckCircle,
  FileCheck2,
  Database,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { NavTab } from './Navbar';
import { getRetrievalHistory } from '../lib/api';
import { RetrievalHistoryRecord, SearchMode } from '../lib/types';

interface DashboardProps {
  onNavigate: (tab: NavTab) => void;
  onLaunchSearchMode?: (mode: SearchMode) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onNavigate,
  onLaunchSearchMode,
}) => {
  const [history, setHistory] = useState<RetrievalHistoryRecord[]>([]);

  useEffect(() => {
    setHistory(getRetrievalHistory());
  }, []);

  const handleStartMode = (mode: SearchMode) => {
    if (onLaunchSearchMode) {
      onLaunchSearchMode(mode);
    }
    onNavigate('retrieval');
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Hero Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-8 border border-slate-800 text-white shadow-xl relative overflow-hidden">
        <div className="max-w-2xl relative z-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Audit Intelligence Unit &bull; Client Data Retrieval System</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
            AIU Data Retrieval
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            Search and retrieve client data using single identifiers or bulk input files.
            Specify exactly which output fields you require, preview the matching results, and export to CSV, Excel, or TXT.
          </p>
        </div>
      </div>

      {/* AIU V3 Isolated Retrieval Card */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              NEW &bull; AIU V3 ENGINE
            </span>
            <span className="text-xs text-slate-400 font-mono">7 Isolated Relational Tables &bull; SQL-First Retrieval</span>
          </div>
          <h2 className="text-base font-bold text-white">AIU V3 Natural Language &amp; Deterministic Retrieval</h2>
          <p className="text-xs text-slate-300 max-w-2xl">
            Execute complex multi-table queries, equity orders, executed trades, and date-range aggregations with plain English or structured Single &amp; Bulk Search.
          </p>
        </div>
        <button
          onClick={() => onNavigate('v3_retrieval')}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-sm transition-colors shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          <span>Open AIU V3 Retrieval</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </button>
      </div>

      {/* Two Prominent Action Cards: Single Search & Bulk Search */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Single Search Card */}
        <div className="bg-white rounded-xl border border-slate-200 hover:border-blue-300 shadow-xs hover:shadow-md transition-all p-6 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Single Search</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Search using one Mobile Number, Client Code, or Form Number. Customize output fields and export instantly.
              </p>
            </div>
          </div>

          <div className="pt-6">
            <button
              onClick={() => handleStartMode('single')}
              className="w-full inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors"
            >
              <span>Start Single Search</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bulk Search Card */}
        <div className="bg-white rounded-xl border border-slate-200 hover:border-indigo-300 shadow-xs hover:shadow-md transition-all p-6 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Bulk Search</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Upload a CSV, Excel (.xlsx, .xls), or TXT file and retrieve data for multiple identifiers in batches with deduplication and row traceability.
              </p>
            </div>
          </div>

          <div className="pt-6">
            <button
              onClick={() => handleStartMode('bulk')}
              className="w-full inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors"
            >
              <span>Start Bulk Search</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Recent Retrieval Activity Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900">Recent Retrieval Activity</h3>
          </div>
          {history.length > 0 && (
            <button
              onClick={() => onNavigate('history')}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              View Full History ({history.length})
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
            No retrieval activity recorded yet. Start a Single or Bulk Search above.
          </div>
        ) : (
          <div className="space-y-2">
            {history.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between text-xs"
              >
                <div className="flex items-center space-x-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      item.mode === 'single' ? 'bg-blue-100 text-blue-800' : 'bg-indigo-100 text-indigo-800'
                    }`}
                  >
                    {item.mode}
                  </span>
                  <div>
                    <div className="font-semibold text-slate-900">{item.inputSummary}</div>
                    <div className="text-[11px] text-slate-400">
                      Search By: <span className="font-medium text-slate-600">{item.searchType}</span> &bull;{' '}
                      {new Date(item.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="text-slate-600 font-mono">
                    <strong className="text-emerald-700">{item.matchedCount}</strong> matched
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      item.status === 'MATCHED' || item.status === 'COMPLETED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
