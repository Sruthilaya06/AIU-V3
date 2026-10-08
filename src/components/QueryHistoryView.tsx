// src/components/QueryHistoryView.tsx
// Reframed as Retrieval History for AIU V2.1

import React, { useState, useEffect } from 'react';
import {
  History,
  Trash2,
  Clock,
  Download,
  Filter,
} from 'lucide-react';
import { RetrievalHistoryRecord, SearchMode } from '../lib/types';
import { getRetrievalHistory, clearRetrievalHistory } from '../lib/api';

export const QueryHistoryView: React.FC = () => {
  const [history, setHistory] = useState<RetrievalHistoryRecord[]>([]);
  const [filterMode, setFilterMode] = useState<'ALL' | 'single' | 'bulk'>('ALL');

  useEffect(() => {
    setHistory(getRetrievalHistory());
  }, []);

  const handleClear = () => {
    if (confirm('Clear all audit retrieval history records?')) {
      clearRetrievalHistory();
      setHistory([]);
    }
  };

  const displayedHistory = history.filter((item) => {
    if (filterMode === 'ALL') return true;
    return item.mode === filterMode;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200 mb-1.5">
            <History className="w-3.5 h-3.5 text-blue-600" />
            <span>Auditor Audit Log</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Retrieval History</h2>
          <p className="text-xs text-slate-500">
            Chronological audit log of all Single and Bulk client data retrieval operations.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Filter toggle */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg text-xs">
            {(['ALL', 'single', 'bulk'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterMode(mode)}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  filterMode === mode ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                {mode === 'ALL' ? 'All Modes' : mode === 'single' ? 'Single' : 'Bulk'}
              </button>
            ))}
          </div>

          {history.length > 0 && (
            <button
              onClick={handleClear}
              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Log</span>
            </button>
          )}
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {displayedHistory.length === 0 ? (
          <div className="p-8 text-center">
            <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-700">No Retrieval History Recorded</h4>
            <p className="text-xs text-slate-400 mt-1">
              Any Single Search or Bulk File Processing job will be recorded here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/60 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Date &amp; Time</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4">Search By</th>
                  <th className="py-3 px-4">Input Summary / File</th>
                  <th className="py-3 px-4">Input Count</th>
                  <th className="py-3 px-4">Matched</th>
                  <th className="py-3 px-4">Fields Selected</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {displayedHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(item.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          item.mode === 'single'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        {item.mode}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-700 whitespace-nowrap">
                      {item.searchType.replace('_', ' ').toUpperCase()}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                      {item.inputSummary}
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {item.inputCount}
                    </td>
                    <td className="py-3 px-4 text-emerald-700 font-bold whitespace-nowrap">
                      {item.matchedCount}
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-500 max-w-xs truncate" title={(item.selectedFieldLabels || []).join(', ')}>
                      {(item.selectedFieldLabels || []).length} fields ({(item.selectedFieldLabels || []).slice(0, 3).join(', ')}...)
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          item.status === 'MATCHED' || item.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
