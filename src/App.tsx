// src/App.tsx
// AIU Data Retrieval Application V2.1: Master Container

import React, { useState } from 'react';
import { Navbar, NavTab } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { DataRetrieval } from './components/DataRetrieval';
import { QueryHistoryView } from './components/QueryHistoryView';
import { HelpView } from './components/HelpView';
import { DataValidation } from './components/DataValidation';
import { SchemaAndRelationships } from './components/SchemaAndRelationships';
import { DataExplorer } from './components/DataExplorer';
import { V3DataRetrieval } from './components/v3/V3DataRetrieval';
import { SearchMode } from './lib/types';
import { ShieldCheck } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [initialSearchMode, setInitialSearchMode] = useState<SearchMode>('single');

  const handleLaunchSearchMode = (mode: SearchMode) => {
    setInitialSearchMode(mode);
    setActiveTab('retrieval');
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Auditor Navigation */}
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'home' && (
          <Dashboard
            onNavigate={setActiveTab}
            onLaunchSearchMode={handleLaunchSearchMode}
          />
        )}

        {/* AIU V3 Isolated Retrieval Experience */}
        {activeTab === 'v3_retrieval' && <V3DataRetrieval />}

        {/* Preserved V2 Experiences (Untouched) */}
        {activeTab === 'retrieval' && <DataRetrieval />}

        {activeTab === 'history' && <QueryHistoryView />}

        {activeTab === 'help' && (
          <HelpView onNavigateToRetrieval={() => setActiveTab('retrieval')} />
        )}

        {/* Secondary Admin / Diagnostics Views (Preserved for administrative review) */}
        {activeTab === 'schema' && (
          <div className="space-y-4">
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-purple-900 text-xs flex items-center justify-between">
              <span>Diagnostics Mode: Internal Relational Architecture (R1–R5) &amp; Schema Metadata</span>
              <button
                onClick={() => setActiveTab('retrieval')}
                className="font-bold underline text-purple-700"
              >
                Back to Auditor Retrieval
              </button>
            </div>
            <SchemaAndRelationships />
          </div>
        )}

        {activeTab === 'validation' && (
          <div className="space-y-4">
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-purple-900 text-xs flex items-center justify-between">
              <span>Diagnostics Mode: Referential Integrity, Primary/Foreign Key Verification</span>
              <button
                onClick={() => setActiveTab('retrieval')}
                className="font-bold underline text-purple-700"
              >
                Back to Auditor Retrieval
              </button>
            </div>
            <DataValidation />
          </div>
        )}

        {activeTab === 'explorer' && (
          <div className="space-y-4">
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-purple-900 text-xs flex items-center justify-between">
              <span>Diagnostics Mode: Read-Only Raw Table &amp; JSONB Explorer</span>
              <button
                onClick={() => setActiveTab('retrieval')}
                className="font-bold underline text-purple-700"
              >
                Back to Auditor Retrieval
              </button>
            </div>
            <DataExplorer />
          </div>
        )}
      </main>

      {/* Enterprise Audit Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-slate-700">Audit Intelligence Unit (AIU)</span>
            <span>&bull; Data Retrieval Application V2.1</span>
          </div>
          <div className="flex items-center space-x-4 text-[11px] text-slate-400">
            <span>Single &amp; Bulk File Processing</span>
            <span>&bull;</span>
            <span>CSV / Excel / TXT Export</span>
            <span>&bull;</span>
            <span className="text-emerald-700 font-semibold">Deterministic Relational Engine</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
