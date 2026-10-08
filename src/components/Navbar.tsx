// src/components/Navbar.tsx
// Redesigned auditor-first enterprise navigation for AIU V2.1

import React, { useState } from 'react';
import {
  ShieldCheck,
  Home,
  Search,
  History,
  HelpCircle,
  Settings,
  ChevronDown,
  Database,
  CheckCircle2,
  GitFork,
  Sparkles,
} from 'lucide-react';

export type NavTab =
  | 'home'
  | 'retrieval'
  | 'v3_retrieval'
  | 'history'
  | 'help'
  | 'validation'
  | 'schema'
  | 'explorer';

interface NavbarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange }) => {
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  const mainTabs = [
    { id: 'home' as NavTab, label: 'Home', icon: Home },
    { id: 'v3_retrieval' as NavTab, label: 'AIU V3 Retrieval', icon: Sparkles, isV3: true },
    { id: 'retrieval' as NavTab, label: 'V2 Retrieval', icon: Search },
    { id: 'history' as NavTab, label: 'Retrieval History', icon: History },
    { id: 'help' as NavTab, label: 'Help', icon: HelpCircle },
  ];

  const adminTabs = [
    { id: 'schema' as NavTab, label: 'Relational Schema Map', icon: GitFork },
    { id: 'validation' as NavTab, label: 'Data Validation Audit', icon: CheckCircle2 },
    { id: 'explorer' as NavTab, label: 'Raw Data Explorer', icon: Database },
  ];

  const isCurrentAdminTab = ['schema', 'validation', 'explorer'].includes(activeTab);

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & AIU Logo */}
          <div
            className="flex items-center space-x-3 cursor-pointer select-none"
            onClick={() => onTabChange('home')}
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-inner font-bold">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base tracking-tight text-slate-100">AIU Data Retrieval</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  V2.1 ENTERPRISE
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Audit Intelligence Unit</p>
            </div>
          </div>

          {/* Primary Auditor Tabs */}
          <nav className="flex items-center space-x-1">
            {mainTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setIsAdminOpen(false);
                    onTabChange(tab.id);
                  }}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {(tab as any).isV3 && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/30 text-emerald-300 border border-emerald-400/40">
                      V3
                    </span>
                  )}
                </button>
              );
            })}

            {/* Admin / Diagnostics Secondary Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsAdminOpen(!isAdminOpen)}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isCurrentAdminTab
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Admin / Diagnostics</span>
                <ChevronDown className="w-3 h-3 ml-0.5" />
              </button>

              {isAdminOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-lg bg-slate-800 border border-slate-700 shadow-xl py-1 z-50">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-700">
                    Diagnostics &amp; Metadata
                  </div>
                  {adminTabs.map((adm) => {
                    const AdmIcon = adm.icon;
                    return (
                      <button
                        key={adm.id}
                        onClick={() => {
                          setIsAdminOpen(false);
                          onTabChange(adm.id);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center space-x-2.5 transition-colors ${
                          activeTab === adm.id
                            ? 'bg-purple-600 text-white'
                            : 'text-slate-200 hover:bg-slate-700'
                        }`}
                      >
                        <AdmIcon className="w-3.5 h-3.5" />
                        <span>{adm.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
};
