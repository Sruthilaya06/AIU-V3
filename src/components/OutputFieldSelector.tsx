// src/components/OutputFieldSelector.tsx
// Reusable Output Field Selector Component with Search/Filter and Safety Warnings

import React, { useState } from 'react';
import { Search, AlertCircle, ShieldAlert, CheckSquare, Square } from 'lucide-react';
import { OUTPUT_FIELDS_CATALOG } from '../lib/metadata';
import { OutputFieldCategory } from '../lib/types';

interface OutputFieldSelectorProps {
  selectedFieldIds: string[];
  onChange: (newSelectedIds: string[]) => void;
}

export const OutputFieldSelector: React.FC<OutputFieldSelectorProps> = ({
  selectedFieldIds,
  onChange,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories: OutputFieldCategory[] = [
    'Client Information',
    'Personal Information',
    'Contact Information',
    'Account Information',
  ];

  const handleSelectAll = () => {
    onChange(OUTPUT_FIELDS_CATALOG.map((f) => f.id));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const toggleField = (id: string) => {
    if (selectedFieldIds.includes(id)) {
      onChange(selectedFieldIds.filter((item) => item !== id));
    } else {
      onChange([...selectedFieldIds, id]);
    }
  };

  const toggleCategory = (cat: OutputFieldCategory) => {
    const catFields = OUTPUT_FIELDS_CATALOG.filter((f) => f.category === cat);
    const catFieldIds = catFields.map((f) => f.id);
    const allSelected = catFieldIds.every((id) => selectedFieldIds.includes(id));

    if (allSelected) {
      onChange(selectedFieldIds.filter((id) => !catFieldIds.includes(id)));
    } else {
      const merged = Array.from(new Set([...selectedFieldIds, ...catFieldIds]));
      onChange(merged);
    }
  };

  // Filter catalog by search query
  const q = searchQuery.toLowerCase().trim();
  const filteredCatalog = OUTPUT_FIELDS_CATALOG.filter(
    (f) =>
      f.label.toLowerCase().includes(q) ||
      f.category.toLowerCase().includes(q) ||
      (f.description && f.description.toLowerCase().includes(q))
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
      {/* Header bar with search input, counter and action buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Output Fields Selection
            </h3>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold font-mono ${
                selectedFieldIds.length > 0
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              Selected: {selectedFieldIds.length} of {OUTPUT_FIELDS_CATALOG.length}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Select the specific business data fields to retrieve and export in your audit result.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Output field search filter */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search output fields..."
              className="pl-8 pr-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 w-44"
            />
          </div>

          <button
            type="button"
            onClick={handleSelectAll}
            className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            Select All
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Mandatory selection error */}
      {selectedFieldIds.length === 0 && (
        <div className="flex items-center space-x-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="font-semibold">
            Please select at least one output field to proceed with data retrieval.
          </span>
        </div>
      )}

      {/* Safety warning if a very large number of fields is selected (Priority 13) */}
      {selectedFieldIds.length >= 15 && (
        <div className="flex items-center space-x-2 p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-xs">
          <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            Notice: Large field selections may produce larger files and may include sensitive client information.
          </span>
        </div>
      )}

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {categories.map((category) => {
          const fields = filteredCatalog.filter((f) => f.category === category);
          if (fields.length === 0 && searchQuery) return null;

          const totalInCat = OUTPUT_FIELDS_CATALOG.filter((f) => f.category === category).length;
          const selectedInCat = OUTPUT_FIELDS_CATALOG.filter(
            (f) => f.category === category && selectedFieldIds.includes(f.id)
          ).length;
          const isAllCatSelected = selectedInCat === totalInCat;

          return (
            <div
              key={category}
              className="bg-slate-50/70 border border-slate-200 rounded-lg p-3 flex flex-col justify-between"
            >
              {/* Category Header */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-800">{category}</span>
                <button
                  type="button"
                  onClick={() => toggleCategory(category)}
                  className="text-[11px] font-medium text-blue-600 hover:underline"
                >
                  {isAllCatSelected ? 'Deselect' : 'All'}
                </button>
              </div>

              {/* Field Checkboxes */}
              <div className="space-y-1.5 flex-1">
                {fields.map((field) => {
                  const isChecked = selectedFieldIds.includes(field.id);
                  return (
                    <label
                      key={field.id}
                      className={`flex items-start space-x-2 p-1.5 rounded cursor-pointer transition-colors text-xs select-none ${
                        isChecked
                          ? 'bg-blue-50/80 text-blue-900 font-medium'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleField(field.id)}
                        className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <div className="leading-tight">
                        <span>{field.label}</span>
                        {field.description && (
                          <span className="text-[10px] text-slate-400 block font-normal">
                            {field.description}
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="mt-2 pt-2 border-t border-slate-200 text-[10px] text-slate-400 text-right">
                {selectedInCat} / {totalInCat} selected
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
