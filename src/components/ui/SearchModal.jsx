import { useState, useMemo, useEffect, useRef } from "react";
import { Search, X, IndianRupee } from "lucide-react";
import { useExpenses } from "../../context/ExpenseContext";
import { formatCurrency, formatDate } from "../../utils/helpers";
import { useNavigate } from "react-router-dom";

export function SearchModal({ isOpen, onClose }) {
  const { expenses } = useExpenses();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const results = useMemo(() => {
    if (!query.trim() || !expenses) return [];
    
    const searchLower = query.toLowerCase();
    
    return expenses.filter(tx => {
       const descMatch = tx.description?.toLowerCase().includes(searchLower);
       const catMatch = tx.category?.toLowerCase().includes(searchLower);
       const amountMatch = tx.amount?.toString().includes(searchLower);
       const dateMatch = formatDate(tx.date).toLowerCase().includes(searchLower);
       
       return descMatch || catMatch || amountMatch || dateMatch;
    }).slice(0, 10);
  }, [query, expenses]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (results.length > 0 && results[selectedIndex]) {
          onClose();
          navigate('/transactions?highlight=' + results[selectedIndex].id);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose, navigate]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-16 sm:pt-24 px-4 pb-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col animate-in slide-in-from-top-4 zoom-in-95 duration-200 text-slate-800 dark:text-slate-200">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search transactions by name, category, or amount..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-lg"
          />
          {query && (
            <button onClick={() => setQuery("")} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
               <X className="w-4 h-4" />
            </button>
          )}
          <button onClick={onClose} className="p-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 rounded text-xs font-semibold uppercase tracking-wider ml-2 hidden sm:block">
             ESC
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900">
          {query.trim().length > 0 ? (
             results.length > 0 ? (
               <div className="p-2 space-y-1">
                 {results.map((tx, index) => (
                    <button
                       key={tx.id}
                       onClick={() => {
                          onClose();
                          navigate('/transactions?highlight=' + tx.id);
                       }}
                       onMouseEnter={() => setSelectedIndex(index)}
                       className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors text-left group ${index === selectedIndex ? 'bg-slate-100 dark:bg-slate-800 ring-2 ring-primary/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                    >
                       <div className="flex items-center gap-4 min-w-0">
                         <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'expense' ? 'bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400' : 'bg-green-50 dark:bg-green-500/10 text-green-500 dark:text-green-400'}`}>
                           <IndianRupee className="w-5 h-5" />
                         </div>
                         <div className="min-w-0">
                           <p className="font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-primary transition-colors">
                             {tx.description}
                           </p>
                           <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                             {formatDate(tx.date)} • {tx.category}
                           </p>
                         </div>
                       </div>
                       <span className={`shrink-0 font-semibold ml-4 ${tx.type === 'expense' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                         {tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount)}
                       </span>
                    </button>
                 ))}
               </div>
             ) : (
               <div className="py-12 p-4 text-center text-slate-500 dark:text-slate-400">
                  <p className="font-medium text-lg mb-1">No results found for &quot;{query}&quot;</p>
                  <p className="text-sm">Try different keywords or check your spelling.</p>
               </div>
             )
          ) : (
            <div className="p-8 text-center text-slate-400 text-sm">
               Start typing to search your transactions.
            </div>
          )}
        </div>
        
        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-between items-center text-xs text-slate-400">
           <span>{results.length} result{results.length !== 1 && 's'}</span>
           <span className="hidden sm:inline">Use ↑↓ arrows and Enter to navigate</span>
        </div>
      </div>
    </div>
  );
}
