import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { formatCurrency, formatDate, downloadCSV } from "../utils/helpers";
import { IndianRupee, Trash2, Download, Pencil, Filter, Calendar, ChevronDown } from "lucide-react";
import { useExpenses } from "../context/ExpenseContext";
import { useAuth } from "../hooks/useAuth";
import { Modal } from "../components/ui/Modal";
import { ExpenseForm } from "../components/expenses/ExpenseForm";
import { Select } from "../components/ui/Select";
import { useToast } from "../context/ToastContext";
import { useModal } from "../context/ModalContext";
import { useLocation } from "react-router-dom";
import { Receipt, X } from "lucide-react";

export function Transactions() {
  const { expenses, loading, deleteExpense, updateExpense } = useExpenses();
  const { user } = useAuth();
  const { addToast } = useToast();
  const { confirm } = useModal();
  const [selectedParent, setSelectedParent] = useState("All Categories");
  const [selectedChild, setSelectedChild] = useState("All Subcategories");
  const [selectedTimeframe, setSelectedTimeframe] = useState("all");
  const [editingData, setEditingData] = useState(null);
  const [viewingReceipt, setViewingReceipt] = useState(null);
  
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const highlightId = searchParams.get("highlight");

  useEffect(() => {
    if (highlightId && !loading && expenses.length) {
      setTimeout(() => {
        const el = document.getElementById(`tx-${highlightId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("ring-4", "ring-primary", "bg-blue-50", "dark:bg-blue-900/40");
          setTimeout(() => {
            el.classList.remove("ring-4", "ring-primary", "bg-blue-50", "dark:bg-blue-900/40");
          }, 3000);
        }
      }, 300);
    }
  }, [highlightId, loading, expenses]);

  const categoryTree = useMemo(() => {
     const tree = {};
     expenses.forEach(e => {
        const parts = e.category.split(':');
        const parent = parts[0].trim();
        const child = parts.length > 1 ? parts[1].trim() : null;

        if (!tree[parent]) tree[parent] = new Set();
        if (child) tree[parent].add(child);
     });
     return tree;
  }, [expenses]);

  const parentOptions = ["All Categories", ...Object.keys(categoryTree).sort()];
  
  const hasSubcategories = selectedParent !== "All Categories" && categoryTree[selectedParent]?.size > 0;
  const childOptions = hasSubcategories 
      ? ["All Subcategories", ...Array.from(categoryTree[selectedParent]).sort()] 
      : [];

  useEffect(() => {
     setSelectedChild("All Subcategories");
  }, [selectedParent]);

  const filteredExpenses = useMemo(() => {
     const now = new Date();
     return expenses.filter(e => {
        // Timeline filtering
        const d = new Date(e.date);
        if (selectedTimeframe === 'month') {
           if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
        } else if (selectedTimeframe === '7days') {
           const diff = Math.ceil(Math.abs(now - d) / (1000 * 60 * 60 * 24));
           if (diff > 7) return false;
        } else if (selectedTimeframe === 'today') {
           if (d.toDateString() !== now.toDateString()) return false;
        }

        // Category filtering
        if (selectedParent === "All Categories") return true;
        
        const parts = e.category.split(':');
        const parent = parts[0].trim();
        const child = parts.length > 1 ? parts[1].trim() : null;

        if (parent !== selectedParent) return false;
        if (selectedChild !== "All Subcategories") {
           return child === selectedChild;
        }
        
        return true;
     });
  }, [expenses, selectedParent, selectedChild, selectedTimeframe]);

  const groupedExpenses = useMemo(() => {
     const groups = {};
     filteredExpenses.forEach(tx => {
        const dateStr = formatDate(tx.date);
        if (!groups[dateStr]) groups[dateStr] = [];
        groups[dateStr].push(tx);
     });
     return groups;
  }, [filteredExpenses]);

  const handleUpdate = async (updatedData) => {
    if (!editingData) return;
    try {
       await updateExpense(editingData.id, updatedData);
       setEditingData(null);
       addToast("Transaction updated successfully", "success");
    } catch (e) {
       addToast("Failed to update transaction.", "error");
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading Transactions...</div>;
  if (!user) return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Sign in to view your transactions.</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <h2 className="text-2xl font-bold dark:text-white shrink-0">All Transactions</h2>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto">
           
           {/* Mobile: Grid so they stack. Desktop: Flex row */}
           <div className="grid grid-cols-1 sm:flex sm:items-center gap-3 sm:gap-2 bg-slate-50 dark:bg-slate-800/50 p-2 sm:p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 w-full sm:w-auto">
               
               <div className="flex items-center gap-2">
                 <Calendar className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block ml-2" />
                 <Select 
                    value={selectedTimeframe} 
                    onChange={setSelectedTimeframe}
                    options={[
                       { label: "All Time", value: "all" },
                       { label: "This Month", value: "month" },
                       { label: "Last 7 Days", value: "7days" },
                       { label: "Today", value: "today" },
                    ]}
                    className="w-full sm:w-36"
                 />
               </div>

               <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 hidden sm:block mx-1 shrink-0"></div>

               <div className="flex items-center gap-2">
                 <Filter className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block ml-1" />
                 <Select 
                    value={selectedParent} 
                    onChange={setSelectedParent}
                    options={parentOptions.map(c => ({ label: c, value: c }))}
                    className="w-full sm:w-44"
                 />
               </div>

               {hasSubcategories && (
                  <div className="w-full sm:w-44 shrink-0 animate-in fade-in slide-in-from-right-2 sm:ml-1">
                     <Select 
                        value={selectedChild} 
                        onChange={setSelectedChild}
                        options={childOptions.map(c => ({ label: c, value: c }))}
                        className="w-full"
                     />
                  </div>
               )}
           </div>
           
           <Button variant="outline" size="sm" onClick={() => downloadCSV(filteredExpenses)} disabled={!filteredExpenses.length} className="hidden sm:flex gap-2 shrink-0 bg-white dark:bg-slate-900">
               <Download className="w-4 h-4" /> Export
           </Button>
        </div>
      </div>

      <div className="mb-2">
        {filteredExpenses.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center">
               <p className="text-lg font-medium mb-1">No transactions found</p>
               <p className="text-sm">Try adjusting your time or category filters.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedExpenses).map(([date, items]) => (
              <div key={date} className="relative">
                <div className="sticky top-16 z-10 flex justify-center pointer-events-none mb-3">
                  <div className="bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-md shadow-sm px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 pointer-events-auto border border-slate-200 dark:border-slate-700/50">
                    {date}
                  </div>
                </div>
                <Card className="overflow-hidden bg-white dark:bg-slate-900 shadow-sm border-slate-200 dark:border-slate-800">
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {items.map(tx => (
                      <div id={`tx-${tx.id}`} key={tx.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-500 gap-4 group">
                        <div className="flex gap-4 items-center">
                          <div className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${tx.type === 'expense' ? 'bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400' : 'bg-green-50 dark:bg-green-500/10 text-green-500 dark:text-green-400'}`}>
                            <IndianRupee className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                              {tx.description}
                              {tx.receiptImage && (
                                <button 
                                  onClick={() => setViewingReceipt(tx.receiptImage)}
                                  className="text-slate-400 hover:text-primary transition-colors"
                                  title="View Receipt"
                                >
                                  <Receipt className="w-4 h-4" />
                                </button>
                              )}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{tx.category}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 justify-between sm:justify-end">
                          <span className={`font-semibold text-lg mr-2 ${tx.type === 'expense' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                            {tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount)}
                          </span>
                          <button 
                             onClick={() => setEditingData(tx)}
                             className="p-2 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all active:scale-95"
                             title="Edit Transaction"
                          >
                             <Pencil className="w-5 h-5" />
                          </button>
                          <button 
                             onClick={async () => {
                                const isConfirmed = await confirm({
                                   title: "Delete Transaction",
                                   message: "Are you sure you want to delete this transaction?",
                                   confirmText: "Delete",
                                   confirmVariant: "danger"
                                });
                                if (isConfirmed) {
                                   try {
                                      await deleteExpense(tx.id);
                                      addToast("Transaction deleted", "success");
                                   } catch(err) {
                                      addToast("Failed to delete transaction", "error");
                                   }
                                }
                             }}
                             className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all active:scale-95"
                             title="Delete Expense"
                          >
                             <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={!!editingData} onClose={() => setEditingData(null)} title="Edit Transaction">
         {editingData && (
            <ExpenseForm 
               initialData={editingData} 
               onSubmit={handleUpdate} 
               onCancel={() => setEditingData(null)} 
            />
         )}
      </Modal>

      {/* Receipt Viewer Modal */}
      {viewingReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/80 backdrop-blur-sm animate-in fade-in transition-all">
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden max-w-2xl w-full max-h-[90vh] flex flex-col animate-in zoom-in-95">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-semibold text-slate-900 dark:text-white">Transaction Receipt</h3>
              <button onClick={() => setViewingReceipt(null)} className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto flex items-center justify-center bg-slate-50 dark:bg-slate-950">
              <img src={viewingReceipt} alt="Receipt" className="max-w-full max-h-[70vh] object-contain rounded border border-slate-200 dark:border-slate-700" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
