import { useExpenses } from "../context/ExpenseContext";
import { Card, CardContent } from "../components/ui/Card";
import { formatDate, formatCurrency } from "../utils/helpers";
import { Image, FileText, Download } from "lucide-react";
import { useState } from "react";
import { Modal } from "../components/ui/Modal";

export function Vault() {
  const { expenses } = useExpenses();
  const [selectedTx, setSelectedTx] = useState(null);

  const vaultItems = expenses.filter((tx) => tx.receiptImage || tx.notes);

  return (
    <div className="space-y-6">
      <div>
         <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">
            <Image className="w-6 h-6 text-indigo-500" />
            Vault
         </h2>
         <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">All your saved receipts and attached notes in one place.</p>
      </div>

      {vaultItems.length === 0 ? (
         <Card className="bg-slate-50 border-dashed dark:bg-slate-900/50">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
               <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-4">
                  <Image className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
               </div>
               <h3 className="text-lg font-medium text-slate-900 dark:text-slate-200 mb-1">Your vault is empty</h3>
               <p className="text-sm max-w-sm">Upload receipts or add notes to your transactions, and they'll safely appear here.</p>
            </CardContent>
         </Card>
      ) : (
         <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
            {vaultItems.map(tx => (
               <Card 
                  key={tx.id} 
                  className="break-inside-avoid shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden border-slate-200 dark:border-slate-800 group"
                  onClick={() => setSelectedTx(tx)}
               >
                  {tx.receiptImage && (
                     <div className="w-full bg-slate-100 dark:bg-slate-950 flex items-center justify-center border-b border-slate-100 dark:border-slate-800">
                       <img src={tx.receiptImage} alt="Receipt" className="object-contain w-full max-h-60 group-hover:scale-105 transition-transform duration-500" />
                     </div>
                  )}
                  <CardContent className="p-4 bg-white dark:bg-slate-900">
                     {tx.notes && (
                       <div className="mb-3 text-sm text-slate-700 dark:text-slate-300 italic bg-amber-50 dark:bg-amber-500/10 p-3 rounded-lg border border-amber-100 dark:border-amber-500/20">
                          &quot;{tx.notes}&quot;
                       </div>
                     )}
                     <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                           <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{tx.description}</p>
                           <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{formatDate(tx.date)}</p>
                        </div>
                        <span className={`shrink-0 font-semibold text-sm ${tx.type === 'expense' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                           {tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount)}
                        </span>
                     </div>
                  </CardContent>
               </Card>
            ))}
         </div>
      )}

      <Modal isOpen={!!selectedTx} onClose={() => setSelectedTx(null)} title="Vault Item">
         {selectedTx && (
            <div className="space-y-4">
               {selectedTx.receiptImage && (
                  <div className="rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex justify-center p-2 isolate">
                     <img src={selectedTx.receiptImage} alt="Receipt Full" className="max-w-full max-h-[50vh] object-contain rounded" />
                  </div>
               )}
               {selectedTx.notes && (
                  <div className="bg-amber-50 dark:bg-amber-500/10 p-4 rounded-lg border border-amber-100 dark:border-amber-500/20">
                     <div className="flex items-center gap-2 mb-2 text-amber-800 dark:text-amber-500 font-bold text-sm">
                        <FileText className="w-4 h-4" /> Attached Notes
                     </div>
                     <p className="text-sm text-amber-900 dark:text-amber-100 whitespace-pre-wrap">{selectedTx.notes}</p>
                  </div>
               )}
               <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div>
                     <p className="font-bold text-slate-900 dark:text-white leading-tight mb-1">{selectedTx.description}</p>
                     <p className="text-xs text-slate-500 dark:text-slate-400">{selectedTx.category} • {formatDate(selectedTx.date)}</p>
                  </div>
                  <div className={`font-bold text-lg ${selectedTx.type === 'expense' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                     {selectedTx.type === 'expense' ? '-' : '+'}{formatCurrency(selectedTx.amount)}
                  </div>
               </div>
            </div>
         )}
      </Modal>
    </div>
  );
}
