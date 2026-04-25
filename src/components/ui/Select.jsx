import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export function Select({ value, onChange, options, placeholder = "Select...", className = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLabel = options.find(opt => opt.value === value)?.label || placeholder;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 appearance-none rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-3 pr-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm transition-colors cursor-pointer disabled:opacity-50"
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full min-w-max mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 flex flex-col">
          <ul className="max-h-60 overflow-y-auto custom-scrollbar py-1">
            {options.map((opt) => (
              <li
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                  value === opt.value
                    ? "text-primary font-medium bg-slate-50/50 dark:bg-slate-800/50"
                    : "text-slate-700 dark:text-slate-300"
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {value === opt.value && <Check className="w-4 h-4 text-primary shrink-0 ml-2" />}
              </li>
            ))}
            {options.length === 0 && (
               <li className="px-3 py-2 text-sm text-slate-400 italic">No options</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
