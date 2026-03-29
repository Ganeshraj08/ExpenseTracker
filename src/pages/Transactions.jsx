import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { formatCurrency, formatDate, downloadCSV } from "../utils/helpers";
import { DollarSign, Trash2, Download, Pencil, Filter, Calendar } from "lucide-react";
import { useExpenses } from "../context/ExpenseContext";
import { useAuth } from "../hooks/useAuth";
import { Modal } from "../components/ui/Modal";
import { ExpenseForm } from "../components/expenses/ExpenseForm";

export function Transactions() {
  const { expenses, loading, deleteExpense, updateExpense } = useExpenses();
  const { user } = useAuth();
  const [selectedParent, setSelectedParent] = useState("All Categories");
  const [selectedChild, setSelectedChild] = useState("All Subcategories");
  const [selectedTimeframe, setSelectedTimeframe] = useState("all");
  const [editingData, setEditingData] = useState(null);

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

  const handleUpdate = async (updatedData) => {
    if (!editingData) return;
    try {
       await updateExpense(editingData.id, updatedData);
       setEditingData(null);
    } catch (e) {
       alert("Failed to update transaction.");
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading Transactions...</div>;
  if (!user) return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Sign in to view your transactions.</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <h2 className="text-2xl font-bold dark:text-white shrink-0">All Transactions</h2>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto">
           
           <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 w-full sm:w-auto overflow-x-auto">
               <Calendar className="w-4 h-4 text-slate-400 ml-2 shrink-0 hidden sm:block" />
               <select 
                  value={selectedTimeframe} 
                  onChange={e => setSelectedTimeframe(e.target.value)}
                  className="w-full sm:w-32 shrink-0 rounded-md border-transparent dark:border-transparent bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm transition-colors"
               >
                  <option value="all">All Time</option>
                  <option value="month">This Month</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="today">Today</option>
               </select>

               <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 hidden sm:block mx-1"></div>

               <Filter className="w-4 h-4 text-slate-400 ml-1 shrink-0 hidden sm:block" />
               <select 
                  value={selectedParent} 
                  onChange={e => setSelectedParent(e.target.value)}
                  className="w-full sm:w-40 shrink-0 rounded-md border-transparent dark:border-transparent bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm transition-colors"
               >
                  {parentOptions.map(c => <option key={c} value={c}>{c}</option>)}
               </select>

               {hasSubcategories && (
                  <select 
                     value={selectedChild} 
                     onChange={e => setSelectedChild(e.target.value)}
                     className="w-full sm:w-40 shrink-0 rounded-md border-transparent dark:border-transparent bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm transition-colors animate-in slide-in-from-right-2"
                  >
                     {childOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
               )}
           </div>
           
           <Button variant="outline" size="sm" onClick={() => downloadCSV(filteredExpenses)} disabled={!filteredExpenses.length} className="hidden sm:flex gap-2 shrink-0 bg-white dark:bg-slate-900">
               <Download className="w-4 h-4" /> Export
           </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {filteredExpenses.length === 0 ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center">
               <p className="text-lg font-medium mb-1">No transactions found</p>
               <p className="text-sm">Try adjusting your time or category filters.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredExpenses.map(tx => (
                <div key={tx.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors gap-4 group">
                  <div className="flex gap-4 items-center">
                    <div className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${tx.type === 'expense' ? 'bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400' : 'bg-green-50 dark:bg-green-500/10 text-green-500 dark:text-green-400'}`}>
                      <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{tx.description}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{formatDate(tx.date)} • {tx.category}</p>
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
                       onClick={() => {
                          if (window.confirm("Are you sure you want to delete this transaction?")) {
                             deleteExpense(tx.id);
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
          )}
        </CardContent>
      </Card>

      <Modal isOpen={!!editingData} onClose={() => setEditingData(null)} title="Edit Transaction">
         {editingData && (
            <ExpenseForm 
               initialData={editingData} 
               onSubmit={handleUpdate} 
               onCancel={() => setEditingData(null)} 
            />
         )}
      </Modal>
    </div>
  );
}
