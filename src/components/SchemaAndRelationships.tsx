// src/components/SchemaAndRelationships.tsx
// AIU Relational Schema & Diagram Viewer (126 Columns, 5 Tables, R1-R5 Relationships)

import React, { useState } from 'react';
import {
  GitFork,
  Database,
  Key,
  Link,
  Search,
  Layers,
  ArrowRight,
  Filter,
  CheckCircle2,
  FileCode,
} from 'lucide-react';
import { TableName } from '../lib/types';
import { TABLES_METADATA, RELATIONSHIPS_METADATA } from '../lib/metadata';

export const SchemaAndRelationships: React.FC = () => {
  const [activeTable, setActiveTable] = useState<TableName>('user_details');
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'keys' | 'text' | 'bigint' | 'date'>('all');

  const currentTableMeta = TABLES_METADATA[activeTable];

  // Total columns calculation across all 5 tables
  const totalColumnsAcrossAll = Object.values(TABLES_METADATA).reduce(
    (acc, t) => acc + t.columns.filter((c) => c.name !== 'data').length,
    0
  );

  const filteredColumns = currentTableMeta.columns.filter((col) => {
    if (col.name === 'data') return false; // Rendered in special JSONB section
    const matchesSearch =
      col.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      (col.description || '').toLowerCase().includes(filterQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'keys') return col.isPrimaryKey || col.isForeignKey;
    if (filterType === 'text') return col.dataType === 'TEXT';
    if (filterType === 'bigint') return col.dataType === 'BIGINT';
    if (filterType === 'date') return col.dataType === 'DATE' || col.dataType === 'TIMESTAMPTZ';

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200 mb-1.5">
            <GitFork className="w-3.5 h-3.5 text-purple-600" />
            <span>AIU Enterprise Schema Definition</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Schema &amp; Centralized Relationship Model
          </h2>
          <p className="text-xs text-slate-500">
            Authoritative metadata model comprising {totalColumnsAcrossAll} column definitions, 5 source tables, and R1–R5 relationships.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="font-semibold text-slate-700">Form Number:</span>{' '}
            <span className="font-mono text-purple-700 font-bold">BIGINT</span>
          </div>
          <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="font-semibold text-slate-700">Identifiers:</span>{' '}
            <span className="font-mono text-blue-700 font-bold">TEXT</span>
          </div>
          <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="font-semibold text-slate-700">Row Backup:</span>{' '}
            <span className="font-mono text-emerald-700 font-bold">JSONB</span>
          </div>
        </div>
      </div>

      {/* Visual Relationship Diagram (Interactive R1 - R5 Model) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-purple-600" />
              <span>Entity Relationship Diagram (ERD)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Interactive relationship map connecting the 5 core tables
            </p>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
            Centralized Metadata Engine
          </span>
        </div>

        {/* Diagram Visualizer */}
        <div className="bg-slate-900 rounded-xl p-6 text-white overflow-x-auto">
          <div className="min-w-[700px] flex flex-col space-y-6">
            {/* Top Row: User Details */}
            <div className="flex justify-center">
              <div
                onClick={() => setActiveTable('user_details')}
                className={`w-72 p-3.5 rounded-lg border-2 cursor-pointer transition-all ${
                  activeTable === 'user_details'
                    ? 'border-blue-400 bg-blue-950/80 shadow-lg shadow-blue-500/20'
                    : 'border-slate-700 bg-slate-800/80 hover:border-slate-500'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold text-blue-300 pb-1.5 border-b border-slate-700">
                  <span>user_details</span>
                  <span className="font-mono text-[10px] text-slate-400">11 cols + JSONB</span>
                </div>
                <div className="mt-2 text-xs space-y-1 font-mono">
                  <div className="flex items-center text-amber-300">
                    <Key className="w-3 h-3 mr-1" />
                    <span>client_code (TEXT) [PK]</span>
                  </div>
                  <div className="text-slate-400 text-[11px]">user_account_status_flag</div>
                  <div className="text-slate-400 text-[11px]">user_equity_allowed, user_mf_allowed</div>
                </div>
              </div>
            </div>

            {/* Connecting arrows R1 & R2 */}
            <div className="flex justify-center items-center space-x-4 text-xs font-mono text-blue-400">
              <div className="flex items-center space-x-1 bg-slate-800 px-3 py-1 rounded border border-slate-700">
                <span className="font-bold text-amber-400">R1:</span>
                <span>client_code ➔ user_account_information</span>
              </div>
              <div className="flex items-center space-x-1 bg-slate-800 px-3 py-1 rounded border border-slate-700">
                <span className="font-bold text-amber-400">R2:</span>
                <span>client_code ➔ client_details</span>
              </div>
            </div>

            {/* Middle Row: User Account Information */}
            <div className="flex justify-center">
              <div
                onClick={() => setActiveTable('user_account_information')}
                className={`w-80 p-3.5 rounded-lg border-2 cursor-pointer transition-all ${
                  activeTable === 'user_account_information'
                    ? 'border-indigo-400 bg-indigo-950/80 shadow-lg shadow-indigo-500/20'
                    : 'border-slate-700 bg-slate-800/80 hover:border-slate-500'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold text-indigo-300 pb-1.5 border-b border-slate-700">
                  <span>user_account_information</span>
                  <span className="font-mono text-[10px] text-slate-400">14 cols + JSONB</span>
                </div>
                <div className="mt-2 text-xs space-y-1 font-mono">
                  <div className="flex items-center text-amber-300">
                    <Key className="w-3 h-3 mr-1" />
                    <span>form_number (BIGINT) [PK]</span>
                  </div>
                  <div className="flex items-center text-indigo-300">
                    <Link className="w-3 h-3 mr-1" />
                    <span>client_code (TEXT) [FK ➔ user_details]</span>
                  </div>
                  <div className="text-slate-400 text-[11px]">user_bank_account_number</div>
                </div>
              </div>
            </div>

            {/* Connecting arrows R3, R4, R5 */}
            <div className="flex justify-around items-center text-xs font-mono text-slate-400 px-8">
              <div className="bg-slate-800 px-2.5 py-1 rounded border border-slate-700 text-purple-300">
                <span className="font-bold text-amber-400">R3:</span> form_number ➔ address
              </div>
              <div className="bg-slate-800 px-2.5 py-1 rounded border border-slate-700 text-purple-300">
                <span className="font-bold text-amber-400">R4:</span> form_number ➔ personal
              </div>
              <div className="bg-slate-800 px-2.5 py-1 rounded border border-slate-700 text-purple-300">
                <span className="font-bold text-amber-400">R5:</span> form_number ➔ client_details
              </div>
            </div>

            {/* Bottom Row: 3 child tables */}
            <div className="grid grid-cols-3 gap-4">
              {/* Address */}
              <div
                onClick={() => setActiveTable('user_address_details')}
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  activeTable === 'user_address_details'
                    ? 'border-purple-400 bg-purple-950/80 shadow-lg'
                    : 'border-slate-700 bg-slate-800/80 hover:border-slate-500'
                }`}
              >
                <div className="text-xs font-bold text-purple-300 pb-1 border-b border-slate-700">
                  user_address_details (20 cols)
                </div>
                <div className="mt-1.5 text-xs font-mono text-slate-300 space-y-1">
                  <div className="text-indigo-300 flex items-center">
                    <Link className="w-3 h-3 mr-1" />
                    <span>form_number (BIGINT) [FK]</span>
                  </div>
                  <div className="text-emerald-300">user_mobile_number (TEXT)</div>
                  <div className="text-slate-400 text-[10px]">user_city, user_state, user_pin</div>
                </div>
              </div>

              {/* Personal */}
              <div
                onClick={() => setActiveTable('user_personal_details')}
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  activeTable === 'user_personal_details'
                    ? 'border-purple-400 bg-purple-950/80 shadow-lg'
                    : 'border-slate-700 bg-slate-800/80 hover:border-slate-500'
                }`}
              >
                <div className="text-xs font-bold text-purple-300 pb-1 border-b border-slate-700">
                  user_personal_details (33 cols)
                </div>
                <div className="mt-1.5 text-xs font-mono text-slate-300 space-y-1">
                  <div className="text-indigo-300 flex items-center">
                    <Link className="w-3 h-3 mr-1" />
                    <span>form_number (BIGINT) [FK]</span>
                  </div>
                  <div className="text-emerald-300">user_first_name, last_name</div>
                  <div className="text-slate-400 text-[10px]">user_dob, user_email, aadhar</div>
                </div>
              </div>

              {/* Client Details */}
              <div
                onClick={() => setActiveTable('client_details')}
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  activeTable === 'client_details'
                    ? 'border-purple-400 bg-purple-950/80 shadow-lg'
                    : 'border-slate-700 bg-slate-800/80 hover:border-slate-500'
                }`}
              >
                <div className="text-xs font-bold text-purple-300 pb-1 border-b border-slate-700">
                  client_details (48 cols)
                </div>
                <div className="mt-1.5 text-xs font-mono text-slate-300 space-y-1">
                  <div className="text-indigo-300 flex items-center">
                    <Link className="w-3 h-3 mr-1" />
                    <span>form_number &amp; client_code [FKs]</span>
                  </div>
                  <div className="text-emerald-300">client_pan_number (TEXT)</div>
                  <div className="text-slate-400 text-[10px]">client_verify_status, product</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Schema Table Inspection */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Selector Tabs */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-2">
          {(Object.keys(TABLES_METADATA) as TableName[]).map((tbl) => {
            const meta = TABLES_METADATA[tbl];
            const isActive = activeTable === tbl;
            return (
              <button
                key={tbl}
                onClick={() => setActiveTable(tbl)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>{meta.displayName}</span>
                <span
                  className={`text-[10px] px-1.5 rounded font-mono ${
                    isActive ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {meta.columns.filter((c) => c.name !== 'data').length} cols
                </span>
              </button>
            );
          })}
        </div>

        {/* Filters bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder={`Search ${currentTableMeta.displayName} columns...`}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">Filter type:</span>
            {(['all', 'keys', 'text', 'bigint', 'date'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-2.5 py-1 rounded text-xs font-medium uppercase transition-colors ${
                  filterType === type
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Columns Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/60 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-4">Column Name</th>
                <th className="py-2.5 px-4">Data Type</th>
                <th className="py-2.5 px-4">Key Constraint</th>
                <th className="py-2.5 px-4">Foreign Target</th>
                <th className="py-2.5 px-4">Business Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredColumns.map((col) => (
                <tr key={col.name} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-4 font-bold text-slate-900 flex items-center space-x-1.5">
                    {col.isPrimaryKey && <Key className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                    {col.isForeignKey && <Link className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
                    <span>{col.name}</span>
                  </td>
                  <td className="py-2.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        col.dataType === 'BIGINT'
                          ? 'bg-purple-100 text-purple-800'
                          : col.dataType === 'TEXT'
                          ? 'bg-blue-100 text-blue-800'
                          : col.dataType === 'DATE' || col.dataType === 'TIMESTAMPTZ'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {col.dataType}
                    </span>
                  </td>
                  <td className="py-2.5 px-4">
                    {col.isPrimaryKey && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        PRIMARY KEY
                      </span>
                    )}
                    {col.isForeignKey && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
                        FOREIGN KEY
                      </span>
                    )}
                    {!col.isPrimaryKey && !col.isForeignKey && (
                      <span className="text-slate-400 font-sans text-[11px]">-</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-slate-600">
                    {col.fkTarget ? (
                      <span className="text-indigo-700 font-medium">
                        {col.fkTarget.table}.{col.fkTarget.column}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-sans text-[11px]">-</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 font-sans text-slate-600 max-w-md">
                    {col.description || 'Enterprise audit attribute'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* JSONB Preservation Banner */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center space-x-2">
            <FileCode className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-slate-800">
              Preserved Column: <span className="font-mono">data JSONB</span>
            </span>
            <span>&bull; Contains unmodified raw Excel source row for dynamic queries &amp; legacy compatibility.</span>
          </div>
          <span className="font-bold text-emerald-700">Enforced</span>
        </div>
      </div>
    </div>
  );
};
