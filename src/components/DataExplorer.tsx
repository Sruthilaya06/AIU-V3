// src/components/DataExplorer.tsx
// Read-only enterprise table inspector with pagination, filter, and JSONB viewer

import React, { useState, useEffect } from 'react';
import {
  Database,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  Code,
  Layers,
  ArrowUpDown,
} from 'lucide-react';
import { TableName } from '../lib/types';
import { TABLES_METADATA } from '../lib/metadata';
import { getTableRecords } from '../lib/api';

export const DataExplorer: React.FC = () => {
  const [activeTable, setActiveTable] = useState<TableName>('user_details');
  const [records, setRecords] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const meta = TABLES_METADATA[activeTable];
  const limit = 10;

  useEffect(() => {
    loadData();
  }, [activeTable, page, searchFilter]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await getTableRecords(activeTable, {
        page,
        limit,
        search: searchFilter,
      });
      setRecords(res.records);
      setTotalCount(res.total);
    } finally {
      setIsLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Table Selector & Search Header */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 mb-4 border-b border-slate-100 gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <Database className="w-5 h-5 text-indigo-600" />
              <span>Read-Only Source Table Explorer</span>
            </h2>
            <p className="text-xs text-slate-500">
              Inspect baseline records, verify typed values, and review complete JSONB structures
            </p>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => {
                setSearchFilter(e.target.value);
                setPage(1);
              }}
              placeholder={`Filter in ${meta.displayName}...`}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Table Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(TABLES_METADATA) as TableName[]).map((tbl) => {
            const tMeta = TABLES_METADATA[tbl];
            const isActive = activeTable === tbl;
            return (
              <button
                key={tbl}
                onClick={() => {
                  setActiveTable(tbl);
                  setPage(1);
                  setSearchFilter('');
                }}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <span>{tMeta.displayName}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    isActive ? 'bg-indigo-800 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  50
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Records Table View */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-900">{meta.displayName} Records</span>
            <span className="text-xs text-slate-500 font-mono">
              (Showing {records.length} of {totalCount})
            </span>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-500">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1 rounded bg-white border border-slate-200 disabled:opacity-40 hover:bg-slate-100"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1 rounded bg-white border border-slate-200 disabled:opacity-40 hover:bg-slate-100"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/60 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider">
                {meta.columns
                  .filter((c) => c.name !== 'data')
                  .slice(0, 7)
                  .map((col) => (
                    <th key={col.name} className="py-2.5 px-3 font-mono">
                      {col.name}
                      {col.isPrimaryKey && <span className="text-amber-600 ml-1">(PK)</span>}
                      {col.isForeignKey && <span className="text-indigo-600 ml-1">(FK)</span>}
                    </th>
                  ))}
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {records.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  {meta.columns
                    .filter((c) => c.name !== 'data')
                    .slice(0, 7)
                    .map((col) => (
                      <td key={col.name} className="py-2.5 px-3 whitespace-nowrap text-slate-800">
                        {String(row[col.name] ?? '')}
                      </td>
                    ))}
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => setSelectedRecord(row)}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-sans font-medium transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Code className="w-5 h-5 text-indigo-400" />
                <h4 className="text-sm font-bold">Record Inspection: {meta.displayName}</h4>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-white p-1 text-lg leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4">
              <div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 block">
                  Preserved JSONB Record Payload
                </span>
                <pre className="bg-slate-900 text-emerald-400 p-4 rounded-lg text-xs font-mono overflow-x-auto max-h-96">
                  {JSON.stringify(selectedRecord.data || selectedRecord, null, 2)}
                </pre>
              </div>
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
