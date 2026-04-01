import { useState } from "react";
import { useRecurringExpenses } from "../context/RecurringExpenseContext";
import { useExpenses } from "../context/ExpenseContext";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { useModal } from "../context/ModalContext";
import { useCategories } from "../context/CategoryContext";
import { useToast } from "../context/ToastContext";
import { Repeat, Plus, Trash2, Pencil, Calendar, Clock, CheckCircle, AlertCircle, Mic, Sparkles, Loader2 } from "lucide-react";
import { parseTransactionNLP } from "../services/gemini";

// Shared autocomplete input for categories
function SearchableInput({ value, onChange, options, placeholder, label, id }) {
   return (
      <div className="space-y-1 w-full">
         <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
         <input
            type="text"
            list={id}
            value={value || ""}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
         />
         <datalist id={id}>
            {options.map((opt) => (<option key={opt} value={opt} />))}
         </datalist>
         <p className="text-[10px] text-slate-500 mt-1">Select or type to create</p>
      </div>
   );
}

export function Routines() {
   const { recurringExpenses, addRecurringExpense, updateRecurringExpense, deleteRecurringExpense } = useRecurringExpenses();
   const { addExpense } = useExpenses();
   const { categories, addParentCategory, addSubcategory } = useCategories();
   const { addToast } = useToast();
   const { confirm } = useModal();
   
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [editingRoutine, setEditingRoutine] = useState(null);

   const [title, setTitle] = useState("");
   const [frequency, setFrequency] = useState("Monthly");
   const [time, setTime] = useState("");
   
   // State structure uses parent/sub internally before converting to static category string
   const [transactions, setTransactions] = useState([
      { amount: "", description: "", parentCategory: "", subCategory: "", type: "expense", id: Date.now() }
   ]);

   const [nlpText, setNlpText] = useState("");
   const [aiParsing, setAiParsing] = useState(false);
   const [isListening, setIsListening] = useState(false);

   const handleMagicRoutineAdd = async (transcript) => {
      if (!transcript.trim()) return;
      setAiParsing(true);
      try {
         const result = await parseTransactionNLP(transcript, categories.map(c => c.name));
         const dataArray = result.data || [];
         if (dataArray.length > 0) {
            const newTxs = dataArray.map(t => {
               let pStr = "";
               let sStr = "";
               if (t.category && t.category.includes(":")) {
                  const parts = t.category.split(":");
                  pStr = parts[0].trim();
                  sStr = parts[1].trim();
               } else if (t.category) {
                  pStr = t.category.trim();
               }
               return {
                  amount: t.amount?.toString() || "",
                  description: t.description || "",
                  parentCategory: pStr,
                  subCategory: sStr,
                  type: t.type?.toLowerCase() === "income" ? "income" : "expense",
                  id: Math.random()
               };
            });
            
            const firstRecurring = dataArray.find(d => d.isRecurring);
            if (firstRecurring && firstRecurring.frequency) {
               setFrequency(firstRecurring.frequency);
            }
            setTransactions(prev => {
                if (prev.length === 1 && !prev[0].amount && !prev[0].description) return newTxs;
                return [...prev, ...newTxs];
            });
            setNlpText("");
            addToast("Parsed routine items!", "success");
         }
      } catch (err) {
         addToast("AI couldn't parse that. Try again.", "error");
      } finally {
         setAiParsing(false);
      }
   };

   const toggleVoice = () => {
      if (isListening) return;
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
         addToast("Your browser does not support voice input.", "error");
         return;
      }
      const recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.start();
      setIsListening(true);
      recognition.onresult = (event) => {
         const transcript = event.results[0][0].transcript;
         setNlpText(transcript);
         handleMagicRoutineAdd(transcript);
         setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
   };

   const openModal = (routine = null) => {
      setEditingRoutine(routine);
      if (routine) {
         setTitle(routine.title || routine.description || "");
         setFrequency(routine.frequency || "Monthly");
         setTime(routine.time || "");
         
         const txs = routine.transactions && routine.transactions.length > 0 
            ? routine.transactions
            : [{
               amount: routine.amount || "",
               description: routine.description || "",
               category: routine.category || "",
               type: routine.type || "expense"
            }];
            
         setTransactions(txs.map(t => {
            let pStr = "";
            let sStr = "";
            if (t.category && t.category.includes(":")) {
               const parts = t.category.split(":");
               pStr = parts[0].trim();
               sStr = parts[1].trim();
            } else if (t.category) {
               pStr = t.category.trim();
            }
            return {
               amount: t.amount,
               description: t.description,
               parentCategory: pStr,
               subCategory: sStr,
               type: t.type,
               id: Math.random()
            };
         }));
      } else {
         setTitle("");
         setFrequency("Monthly");
         setTime("");
         setTransactions([{ amount: "", description: "", parentCategory: "", subCategory: "", type: "expense", id: Date.now() }]);
      }
      setNlpText("");
      setIsModalOpen(true);
   };

   const handleSubmit = async (e) => {
      e.preventDefault();
      setIsSubmitting(true);
      
      try {
         // Process categories
         const processedTxs = [];
         for (const t of transactions) {
            let currentParent = t.parentCategory.trim();
            let currentSub = t.subCategory.trim();
            let finalCategory = "Uncategorized";
            
            if (currentParent) {
               finalCategory = currentParent;
               const pData = categories.find(c => c.name.toLowerCase() === currentParent.toLowerCase());
               if (!pData) {
                  await addParentCategory(currentParent, currentSub);
                  if (currentSub) finalCategory = `${currentParent}: ${currentSub}`;
               } else {
                  finalCategory = pData.name;
                  if (currentSub) {
                     finalCategory = `${pData.name}: ${currentSub}`;
                     const subExists = pData.subcategories?.some(s => s.toLowerCase() === currentSub.toLowerCase());
                     if (!subExists) {
                        try { await addSubcategory(pData.id, currentSub); } catch(err){}
                     }
                  }
               }
            }
            
            processedTxs.push({
               amount: parseFloat(t.amount) || 0,
               description: t.description || "Routine Item",
               category: finalCategory,
               type: t.type
            });
         }

         const data = {
            title,
            frequency,
            time,
            transactions: processedTxs
         };
         
         if (editingRoutine) {
            await updateRecurringExpense(editingRoutine.id, data);
            addToast("Routine updated successfully", "success");
         } else {
            await addRecurringExpense({
               ...data,
               lastExecuted: "", 
               lastSkipped: "" 
            });
            addToast("Routine created successfully", "success");
         }
         setIsModalOpen(false);
      } catch (error) {
         addToast("Failed to save routine", "error");
      } finally {
         setIsSubmitting(false);
      }
   };

   const handleDelete = async (routine) => {
      const isConfirmed = await confirm({
         title: "Delete Routine",
         message: `Are you sure you want to stop the routine "${routine.title || routine.description}"?`,
         confirmText: "Delete",
         confirmVariant: "danger"
      });
      if (isConfirmed) {
         try {
            await deleteRecurringExpense(routine.id);
            addToast("Routine deleted", "success");
         } catch(error) {
            addToast("Failed to delete routine", "error");
         }
      }
   };

   const handleLogNow = async (routine) => {
      const txs = routine.transactions || [{
           amount: routine.amount,
           description: routine.description,
           category: routine.category,
           type: routine.type
      }];
      
      const totalAmount = txs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      const isConfirmed = await confirm({
         title: "Log Routine manually",
         message: `Are you sure you want to log "${routine.title || routine.description}" right now? This will log ₹${totalAmount.toFixed(2)} to your ledger.`,
         confirmText: "Log Now",
      });
      
      if (isConfirmed) {
         try {
            for (const t of txs) {
               await addExpense({
                  amount: parseFloat(t.amount),
                  category: t.category || "Uncategorized",
                  description: t.description || 'Routine Item',
                  type: t.type || 'expense',
                  date: new Date().toISOString()
               });
            }
            const todayString = new Date().toLocaleDateString('en-CA');
            await updateRecurringExpense(routine.id, { lastExecuted: todayString });
            addToast("Routine logged successfully", "success");
         } catch(error) {
            addToast("Failed to log routine manually", "error");
         }
      }
   };

   return (
      <div className="space-y-6">
         <div className="flex sm:items-center justify-between flex-col sm:flex-row gap-4">
            <div>
               <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Repeat className="w-6 h-6 text-indigo-500" />
                  Routines
               </h2>
               <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your recurring transactions that automatically prompt you on due dates.</p>
            </div>
            <Button onClick={() => openModal()} className="gap-2 shrink-0">
               <Plus className="w-4 h-4" /> New Routine
            </Button>
         </div>

         {!recurringExpenses || recurringExpenses.length === 0 ? (
            <Card className="bg-slate-50 border-dashed dark:bg-slate-900/50">
               <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-4">
                     <Repeat className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">No routines established</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-4">Set up routines for rent, salaries, or daily expenses so you don't forget to track them.</p>
                  <Button variant="outline" onClick={() => openModal()}>Create your first Routine</Button>
               </CardContent>
            </Card>
         ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {recurringExpenses.map(routine => {
                  const todayStr = new Date().toLocaleDateString('en-CA');
                  const isLoggedToday = routine.lastExecuted === todayStr;
                  const isSkippedToday = routine.lastSkipped === todayStr;
                  
                  const txs = routine.transactions || [{ amount: routine.amount, type: routine.type || 'expense' }];
                  const total = txs.reduce((sum, t) => sum + (Number(t.amount)||0), 0);
                  const isAllIncome = txs.every(t => t.type === 'income');
                  const barColor = isAllIncome ? 'bg-green-500' : 'bg-red-500';

                  return (
                     <Card key={routine.id} className="overflow-hidden flex flex-col hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors">
                        <div className={`h-1.5 w-full ${barColor}`} />
                        <CardContent className="p-5 flex-1 flex flex-col">
                           <div className="flex justify-between items-start mb-4 gap-2">
                              <div className="min-w-0">
                                 <h3 className="font-semibold text-slate-900 dark:text-white truncate" title={routine.title || routine.description}>{routine.title || routine.description}</h3>
                                 <p className="text-xs text-slate-500 truncate">{txs.length} item(s)</p>
                              </div>
                              <div className="font-bold text-lg shrink-0 text-slate-900 dark:text-white">
                                 ₹{total.toFixed(2)}
                              </div>
                           </div>
                           
                           <div className="space-y-2 mb-6 flex-1 text-sm text-slate-600 dark:text-slate-400">
                              <div className="flex items-center gap-2">
                                 <Calendar className="w-4 h-4 text-slate-400" />
                                 <span>{routine.frequency}</span>
                              </div>
                              {routine.time && (
                                 <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-slate-400" />
                                    <span>{routine.time}</span>
                                 </div>
                              )}
                           </div>

                           <div className="flex items-center justify-between gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                              {isLoggedToday ? (
                                 <div className="flex items-center gap-1.5 text-xs font-semibold text-green-600 dark:text-green-500 uppercase tracking-wider bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-md">
                                    <CheckCircle className="w-3.5 h-3.5" /> Logged Today
                                 </div>
                              ) : isSkippedToday ? (
                                 <div className="group relative">
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-600 dark:text-orange-500 uppercase tracking-wider bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-md cursor-pointer hover:bg-orange-100 transition-colors" onClick={() => handleLogNow(routine)}>
                                       <AlertCircle className="w-3.5 h-3.5" /> Skipped
                                    </div>
                                    <div className="absolute outline-none text-[10px] invisible group-hover:visible left-0 -top-6 bg-slate-800 text-white px-2 py-1 rounded z-10 whitespace-nowrap">Click to force log</div>
                                 </div>
                              ) : (
                                 <Button variant="outline" size="sm" onClick={() => handleLogNow(routine)} className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300 dark:border-indigo-900/50 dark:text-indigo-400 dark:hover:bg-indigo-900/30 h-8 px-3 transition-colors text-xs font-semibold uppercase tracking-wider">
                                    Log Now
                                 </Button>
                              )}
                              
                              <div className="flex gap-1 shrink-0">
                                 <Button variant="ghost" size="icon" onClick={() => openModal(routine)} className="text-slate-500 hover:text-blue-600 w-8 h-8 rounded-full">
                                    <Pencil className="w-4 h-4" />
                                 </Button>
                                 <Button variant="ghost" size="icon" onClick={() => handleDelete(routine)} className="text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-8 h-8 rounded-full">
                                    <Trash2 className="w-4 h-4" />
                                 </Button>
                              </div>
                           </div>
                        </CardContent>
                     </Card>
                  );
               })}
            </div>
         )}

         <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingRoutine ? "Edit Routine" : "New Routine"}>
            {!editingRoutine && (
               <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800/80 p-4 mb-4 rounded-xl border border-blue-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                     <Sparkles className="w-16 h-16 text-blue-600" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
                     <Sparkles className="w-4 h-4 text-blue-500" /> Magic Add
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                     Describe all the items for this routine in plain English, and AI will build the entire list for you.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 relative z-10">
                     <input
                        type="text"
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                        placeholder="e.g. 20 for bus and 15 for coffee..."
                        value={nlpText}
                        onChange={(e) => setNlpText(e.target.value)}
                        onKeyDown={(e) => {
                           if (e.key === "Enter") {
                              e.preventDefault();
                              handleMagicRoutineAdd(nlpText);
                           }
                        }}
                        disabled={aiParsing || isListening}
                     />
                     <div className="flex gap-2 w-full sm:w-auto">
                        <Button
                           type="button"
                           variant="outline"
                           onClick={toggleVoice}
                           disabled={aiParsing}
                           className={`flex-1 sm:flex-none justify-center transition-colors ${
                              isListening ? "bg-red-50 text-red-600 border-red-200 animate-pulse" : "hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30"
                           }`}
                        >
                           {isListening ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                        </Button>
                        <Button
                           type="button"
                           onClick={() => handleMagicRoutineAdd(nlpText)}
                           disabled={aiParsing || !nlpText.trim()}
                           className="flex-1 sm:flex-none justify-center"
                        >
                           {aiParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Parse"}
                        </Button>
                     </div>
                  </div>
               </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
               <Input label="Routine Title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Daily Commute" />

               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                     <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Frequency</label>
                     <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="Daily">Daily</option>
                        <option value="Weekdays">Weekdays (Mon-Fri)</option>
                        <option value="Weekly">Weekly</option>
                        <option value="Monthly">Monthly</option>
                     </select>
                  </div>
                  <Input label="Time (Optional)" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
               </div>

               <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center">
                     <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Line Items</h4>
                     <Button type="button" variant="outline" size="sm" onClick={() => setTransactions([...transactions, {amount: "", description: "", parentCategory: "", subCategory: "", type: "expense", id: Date.now()}])} className="h-7 gap-1 text-xs px-2 shadow-sm border-slate-200 hover:bg-slate-50">
                        <Plus className="w-3 h-3" /> Add Item
                     </Button>
                  </div>
                  
                  <div className="max-h-60 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                     {transactions.map((tx, idx) => (
                        <div key={tx.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg space-y-3 relative group transition-colors hover:border-blue-200 dark:hover:border-blue-800">
                           {transactions.length > 1 && (
                              <button type="button" onClick={() => setTransactions(transactions.filter(i => i.id !== tx.id))} className="absolute top-2 right-2 text-slate-400 hover:text-red-500 opacity-50 group-hover:opacity-100 transition-opacity">
                                 <Trash2 className="w-4 h-4" />
                              </button>
                           )}
                           <div className="flex gap-2 mb-2 pr-6">
                              <button type="button" className={`flex-1 py-1 rounded-md text-xs font-semibold transition-colors ${tx.type === "expense" ? "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600"}`} onClick={() => {
                                 const newTx = [...transactions]; newTx[idx].type = "expense"; setTransactions(newTx);
                              }}>Expense</button>
                              <button type="button" className={`flex-1 py-1 rounded-md text-xs font-semibold transition-colors ${tx.type === "income" ? "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600"}`} onClick={() => {
                                 const newTx = [...transactions]; newTx[idx].type = "income"; setTransactions(newTx);
                              }}>Income</button>
                           </div>
                           
                           <div className="grid grid-cols-2 gap-3">
                              <Input label="Amount" type="number" step="0.01" value={tx.amount} onChange={(e) => { const newTx = [...transactions]; newTx[idx].amount = e.target.value; setTransactions(newTx); }} required placeholder="0.00" />
                              <Input label="Description" type="text" value={tx.description} onChange={(e) => { const newTx = [...transactions]; newTx[idx].description = e.target.value; setTransactions(newTx); }} required placeholder="e.g. Coffee" />
                           </div>
                           
                           <div className="grid grid-cols-2 gap-3 pt-1">
                              <SearchableInput
                                 id={`parent-${tx.id}`}
                                 label="Category"
                                 placeholder="Search or Create..."
                                 value={tx.parentCategory}
                                 onChange={(val) => {
                                    const newTx = [...transactions];
                                    newTx[idx].parentCategory = val;
                                    const match = categories.find(c => c.name.toLowerCase() === val.toLowerCase());
                                    if (!match) newTx[idx].subCategory = "";
                                    setTransactions(newTx);
                                 }}
                                 options={categories.map(c => c.name)}
                              />
                              <SearchableInput
                                 id={`sub-${tx.id}`}
                                 label="Subcategory"
                                 placeholder={tx.parentCategory ? "Search or Create..." : "Parent first..."}
                                 value={tx.subCategory}
                                 onChange={(val) => {
                                    const newTx = [...transactions];
                                    newTx[idx].subCategory = val;
                                    setTransactions(newTx);
                                 }}
                                 options={
                                    tx.parentCategory 
                                    ? (categories.find(c => c.name.toLowerCase() === tx.parentCategory.toLowerCase())?.subcategories || [])
                                    : []
                                 }
                              />
                           </div>

                        </div>
                     ))}
                  </div>
               </div>

               <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : editingRoutine ? "Update Routine" : "Create Routine"}</Button>
               </div>
            </form>
         </Modal>
      </div>
   );
}
