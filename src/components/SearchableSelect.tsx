import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

interface Option {
  id: string;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = '[ Select option ]',
  searchPlaceholder = 'Search...',
  className = '',
  disabled = false
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.id === value);

  const filteredOptions = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3.5 py-2 border rounded-lg text-xs bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex items-center justify-between border-slate-300 dark:border-slate-700 focus:outline-none focus:border-emerald-500 disabled:opacity-50 text-left cursor-pointer"
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'transform rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-lg shadow-xl flex flex-col overflow-hidden max-h-60">
          {/* Search box header */}
          <div className="p-2 border-b border-slate-100 dark:border-slate-800 flex items-center bg-slate-50 dark:bg-slate-950/60 shrink-0">
            <Search className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent border-none text-xs focus:outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400"
              autoFocus
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Scrollable Options List */}
          <div className="overflow-y-auto flex-1 py-1 max-h-40">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
                setSearch('');
              }}
              className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 italic font-medium transition-colors cursor-pointer"
            >
              {placeholder}
            </button>
            
            {filteredOptions.map(opt => (
              <button
                type="button"
                key={opt.id}
                onClick={() => {
                  onChange(opt.id);
                  setIsOpen(false);
                  setSearch('');
                }}
                className={`w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer ${
                  value === opt.id ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-700 dark:text-slate-200'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {value === opt.id && <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-500 shrink-0 ml-2">Selected</span>}
              </button>
            ))}
            
            {filteredOptions.length === 0 && (
              <div className="p-3 text-center text-xs text-slate-400 italic">
                No matching relatives found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
