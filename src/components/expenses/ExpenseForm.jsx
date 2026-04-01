import { useState, useMemo, useEffect } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { useCategories } from "../../context/CategoryContext";
import { useExpenses } from "../../context/ExpenseContext";
import { useRecurringExpenses } from "../../context/RecurringExpenseContext";
import { useToast } from "../../context/ToastContext";
import { Mic, Sparkles, Loader2 } from "lucide-react";
import { parseTransactionNLP } from "../../services/gemini";

function SearchableInput({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  label,
  id,
}) {
  return (
    <div className="space-y-1 w-full">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
        {label}
      </label>
      <input
        type="text"
        list={id}
        disabled={disabled}
        value={value || ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-base sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 transition-colors"
      />
      <datalist id={id}>
        {options.map((opt) => (
          <option key={opt} value={opt} />
        ))}
      </datalist>
      <p className="text-[10px] sm:text-xs text-slate-500 mt-1">
        Select from list or type to create new
      </p>
    </div>
  );
}

export function ExpenseForm({ onSubmit, onCancel, initialData = null }) {
  const { categories, addParentCategory, addSubcategory } = useCategories();
  const { addExpense } = useExpenses();
  const { addRecurringExpense } = useRecurringExpenses();
  const { addToast } = useToast();

  const [amount, setAmount] = useState(initialData?.amount?.toString() || "");
  const [description, setDescription] = useState(
    initialData?.description || "",
  );
  const [type, setType] = useState(initialData?.type || "expense");

  const [parentCategory, setParentCategory] = useState(
    initialData?.category?.split(":")[0]?.trim() || "",
  );
  const [subCategory, setSubCategory] = useState(
    initialData?.category?.split(":")[1]?.trim() || "",
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiParsing, setAiParsing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [nlpText, setNlpText] = useState("");
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [bundleTitle, setBundleTitle] = useState("");
  const [groupBundle, setGroupBundle] = useState(false);

  // Recurring state
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState("Monthly");
  const [time, setTime] = useState("");

  //   useEffect(() => {
  //      if (!initialData?.category && categories.length > 0 && !parentCategory) {
  //         setParentCategory(categories[0].name);
  //         if (categories[0].subcategories?.length > 0) {
  //            setSubCategory(categories[0].subcategories[0]);
  //         }
  //      }
  //   }, [categories, initialData, parentCategory]);

  const selectedParentData = useMemo(() => {
    return (
      categories.find(
        (c) => c.name.toLowerCase() === parentCategory.toLowerCase(),
      ) || null
    );
  }, [categories, parentCategory]);

  const handleMagicAdd = async (text) => {
    if (!text || !text.trim()) return;
    setAiParsing(true);
    try {
      const validCategories = [];
      categories.forEach((c) => {
        if (c.subcategories && c.subcategories.length > 0) {
          c.subcategories.forEach((sub) => {
            validCategories.push(`${c.name}: ${sub}`);
          });
        } else {
          validCategories.push(`${c.name}`);
        }
      });

      const result = await parseTransactionNLP(text, validCategories);

      const dataArray = result.data || [];

      if (dataArray.length === 1) {
        const data = dataArray[0];
        if (data.type)
          setType(data.type.toLowerCase() === "income" ? "income" : "expense");
        if (data.amount) setAmount(data.amount.toString());
        if (data.description) setDescription(data.description);
        if (data.category && data.category.includes(":")) {
          const [p, s] = data.category.split(":");
          setParentCategory(p.trim());
          setSubCategory(s.trim());
        } else if (data.category) {
          setParentCategory(data.category.trim());
          setSubCategory("");
        }
        
        if (data.isRecurring) {
            setIsRecurring(true);
            if (data.frequency) setFrequency(data.frequency);
        }
        
        setNlpText(""); // Clear after success
      } else if (dataArray.length > 1) {
        setPendingTransactions(dataArray);
        setNlpText("");
      }
    } catch (err) {
      console.error("AI Parsing Error: ", err);
      addToast(
        "Sorry, AI couldn't parse that. Details: " + err.message,
        "error",
      );
    } finally {
      setAiParsing(false);
    }
  };

  const toggleVoice = () => {
    if (isListening) return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
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
      handleMagicAdd(transcript);
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    let currentParent = parentCategory.trim();
    let currentSub = subCategory.trim();
    let finalCategory = "Uncategorized";

    if (currentParent) {
      finalCategory = currentParent;

      const pData = categories.find(
        (c) => c.name.toLowerCase() === currentParent.toLowerCase(),
      );
      if (!pData) {
        try {
          await addParentCategory(currentParent, currentSub);
          if (currentSub) finalCategory = `${currentParent}: ${currentSub}`;
        } catch (err) {
          console.error(err);
        }
      } else {
        finalCategory = pData.name;
        if (currentSub) {
          finalCategory = `${pData.name}: ${currentSub}`;
          const subExists = pData.subcategories?.some(
            (s) => s.toLowerCase() === currentSub.toLowerCase(),
          );
          if (!subExists) {
            try {
              await addSubcategory(pData.id, currentSub);
            } catch (err) {
              console.error(err);
            }
          }
        }
      }
    }

    try {
      await onSubmit({
        amount: parseFloat(amount),
        description,
        category: finalCategory,
        type,
        date: initialData?.date || new Date().toISOString(),
      });

      if (isRecurring && !initialData) {
         await addRecurringExpense({
            title: description || "Routine",
            frequency,
            time,
            lastExecuted: new Date().toLocaleDateString('en-CA'), // skip today
            transactions: [{
               amount: parseFloat(amount),
               description: description || "Routine Item",
               category: finalCategory,
               type,
            }]
         });
         addToast("Recurring scheduled!", "success");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAllPending = async () => {
    if (pendingTransactions.length === 0) return;
    setIsSubmitting(true);

    let addedCount = 0;
    const sessionAddedParents = new Map();
    const sessionAddedSubs = new Map();
    
    // To group bundled routines
    const recurringItemsByFreq = {};

    try {
      for (const item of pendingTransactions) {
        let currentParent = "";
        let currentSub = "";

        if (item.category && item.category.includes(":")) {
          const [p, s] = item.category.split(":");
          currentParent = p.trim();
          currentSub = s.trim();
        } else if (item.category) {
          currentParent = item.category.trim();
        }

        let finalCategory = "Uncategorized";
        if (currentParent) {
          finalCategory = currentParent;
          const lowerParent = currentParent.toLowerCase();
          let pData =
            categories.find((c) => c.name.toLowerCase() === lowerParent) ||
            sessionAddedParents.get(lowerParent);

          if (!pData) {
            await addParentCategory(currentParent, currentSub);
            sessionAddedParents.set(lowerParent, {
              id: "temp",
              name: currentParent,
              subcategories: currentSub ? [currentSub] : [],
            });
            if (currentSub) {
              sessionAddedSubs.set(
                lowerParent,
                new Set([currentSub.toLowerCase()]),
              );
              finalCategory = `${currentParent}: ${currentSub}`;
            }
          } else {
            finalCategory = pData.name;
            if (currentSub) {
              finalCategory = `${pData.name}: ${currentSub}`;
              const lowerSub = currentSub.toLowerCase();
              let subExists =
                pData.subcategories?.some(
                  (s) => s.toLowerCase() === lowerSub,
                ) || sessionAddedSubs.get(lowerParent)?.has(lowerSub);

              if (!subExists) {
                if (pData.id !== "temp") {
                  await addSubcategory(pData.id, currentSub);
                }
                if (!sessionAddedSubs.has(lowerParent))
                  sessionAddedSubs.set(lowerParent, new Set());
                sessionAddedSubs.get(lowerParent).add(lowerSub);
              }
            }
          }
        }

        await addExpense({
          amount: parseFloat(item.amount),
          description: item.description,
          category: finalCategory,
          type: item.type?.toLowerCase() === "income" ? "income" : "expense",
          date: item.date || new Date().toISOString(),
        });
        
        if (item.isRecurring) {
            if (groupBundle) {
               const freq = item.frequency || "Monthly";
               if (!recurringItemsByFreq[freq]) recurringItemsByFreq[freq] = [];
               recurringItemsByFreq[freq].push({
                  amount: parseFloat(item.amount),
                  description: item.description || "Routine Item",
                  category: finalCategory,
                  type: item.type?.toLowerCase() === "income" ? "income" : "expense",
               });
            } else {
               // Save instantly as standalone routine
               await addRecurringExpense({
                  title: item.description || "Routine",
                  frequency: item.frequency || "Monthly",
                  time: "",
                  lastExecuted: new Date().toLocaleDateString('en-CA'),
                  transactions: [{
                     amount: parseFloat(item.amount),
                     description: item.description || "Routine Item",
                     category: finalCategory,
                     type: item.type?.toLowerCase() === "income" ? "income" : "expense",
                  }]
               });
            }
        }
        addedCount++;
      }
      
      // Save generating routines silently if bundled
      if (groupBundle) {
         for (const [freq, txs] of Object.entries(recurringItemsByFreq)) {
            await addRecurringExpense({
               title: bundleTitle.trim() ? bundleTitle : `AI Generated ${freq} Routine`,
               frequency: freq,
               time: "",
               lastExecuted: new Date().toLocaleDateString('en-CA'),
               transactions: txs
            });
         }
      }

      addToast(`Successfully saved ${addedCount} transactions!`, "success");
      if (onCancel) onCancel();
    } catch (err) {
      console.error("Save All Error:", err);
      addToast("Failed to save some transactions.", "error");
    } finally {
      setIsSubmitting(false);
      setPendingTransactions([]);
    }
  };

  if (pendingTransactions.length > 0) {
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 dark:bg-slate-800 p-4 rounded-xl border border-blue-100 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
            Review Parsed Transactions
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            We found {pendingTransactions.length} transactions. Review them
            before saving.
          </p>
        </div>

        <div className="max-h-96 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
          {pendingTransactions.map((tx, idx) => (
            <div
              key={idx}
              className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm flex items-center justify-between gap-4 relative animate-in slide-in-from-bottom-2 group transition-all"
            >
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${tx.type === "income" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}
                  >
                    {tx.type}
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white truncate">
                    ₹{parseFloat(tx.amount || 0).toFixed(2)}
                  </span>
                </div>
                <p className="font-medium text-sm text-slate-800 dark:text-slate-200 truncate">
                  {tx.description}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {tx.category || "Uncategorized"}
                </p>
                
                <div className="flex items-center gap-3 mt-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
                   <label className="flex items-center gap-1.5 cursor-pointer group">
                      <input 
                         type="checkbox" 
                         checked={tx.isRecurring || false} 
                         onChange={(e) => {
                            setPendingTransactions(prev => prev.map((p, i) => i === idx ? { ...p, isRecurring: e.target.checked, frequency: p.frequency || 'Monthly' } : p));
                         }}
                         className="rounded text-blue-600 focus:ring-blue-500 bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-600 transition-shadow"
                      />
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Recurring</span>
                   </label>
                   
                   {tx.isRecurring && (
                      <select 
                         value={tx.frequency || "Monthly"}
                         onChange={(e) => {
                            setPendingTransactions(prev => prev.map((p, i) => i === idx ? { ...p, frequency: e.target.value } : p));
                         }}
                         className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-1.5 py-0.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow"
                      >
                         <option value="Daily">Daily</option>
                         <option value="Weekdays">Weekdays</option>
                         <option value="Weekly">Weekly</option>
                         <option value="Monthly">Monthly</option>
                      </select>
                   )}
                </div>
              </div>
              <button
                onClick={() =>
                  setPendingTransactions((prev) =>
                    prev.filter((_, i) => i !== idx),
                  )
                }
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors shrink-0"
                title="Remove Transaction"
              >
                <span className="sr-only">Remove</span>✕
              </button>
            </div>
          ))}
          {pendingTransactions.length === 0 && (
            <p className="text-center text-sm text-slate-500 py-4">
              All transactions removed.
            </p>
          )}
        </div>
        
        {pendingTransactions.some(tx => tx.isRecurring) && (
           <div className="bg-white dark:bg-slate-900 p-4 mt-4 rounded-lg border border-slate-200 dark:border-slate-700 w-full animate-in fade-in slide-in-from-bottom-2">
              <label className="flex items-start gap-2.5 cursor-pointer mb-2">
                 <input
                    type="checkbox"
                    checked={groupBundle}
                    onChange={(e) => setGroupBundle(e.target.checked)}
                    className="mt-1 rounded text-blue-600 focus:ring-blue-500 bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-600"
                 />
                 <div>
                    <span className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                       Group into a single Routine bundle
                    </span>
                    <span className="block text-xs text-slate-500 mt-0.5">
                       Check this if all items belong to one event (like "Office Commute"). Uncheck to create separate routines for each item.
                    </span>
                 </div>
              </label>

              {groupBundle && (
                 <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 mt-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 focus-within:text-blue-600 transition-colors">
                       Bundle Title (Optional)
                    </label>
                    <input
                       type="text"
                       value={bundleTitle}
                       onChange={e => setBundleTitle(e.target.value)}
                       placeholder="e.g. Office Commute"
                       className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                    />
                 </div>
              )}
           </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-6">
          <Button
            variant="ghost"
            type="button"
            onClick={() => setPendingTransactions([])}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isSubmitting || pendingTransactions.length === 0}
            onClick={handleSaveAllPending}
          >
            {isSubmitting
              ? "Saving..."
              : `Save All ${pendingTransactions.length} Transactions`}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!initialData && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800/80 p-4 rounded-xl border border-blue-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Sparkles className="w-16 h-16 text-blue-600" />
          </div>

          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-500" /> Magic Add
          </h3>

          <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
            Describe your transaction in plain English, and AI will fill out the
            form for you instantly.
          </p>

          {/* Responsive Container */}
          <div className="flex flex-col sm:flex-row gap-2 relative z-10">
            {/* Input */}
            <input
              type="text"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              placeholder="e.g. Spent ₹150 on Starbucks..."
              value={nlpText}
              onChange={(e) => setNlpText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleMagicAdd(nlpText);
                }
              }}
              disabled={aiParsing || isListening}
            />

            {/* Buttons Wrapper */}
            <div className="flex gap-2 w-full sm:w-auto">
              {/* Mic Button */}
              <Button
                type="button"
                variant="outline"
                onClick={toggleVoice}
                disabled={aiParsing}
                className={`flex-1 sm:flex-none justify-center transition-colors ${
                  isListening
                    ? "bg-red-50 text-red-600 border-red-200 animate-pulse"
                    : "hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30"
                }`}
              >
                {isListening ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </Button>

              {/* Parse Button */}
              <Button
                type="button"
                onClick={() => handleMagicAdd(nlpText)}
                disabled={aiParsing || !nlpText.trim()}
                className="flex-1 sm:flex-none justify-center"
              >
                {aiParsing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Parse"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-4 mb-4">
          <button
            type="button"
            className={`flex-1 py-2 rounded-lg text-base sm:text-sm font-medium transition-colors ${type === "expense" ? "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}
            onClick={() => setType("expense")}
          >
            Expense
          </button>
          <button
            type="button"
            className={`flex-1 py-2 rounded-lg text-base sm:text-sm font-medium transition-colors ${type === "income" ? "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}
            onClick={() => setType("income")}
          >
            Income
          </button>
        </div>

        <Input
          label="Amount"
          type="number"
          step="0.01"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />

        <Input
          label="Description"
          type="text"
          placeholder="What was this for?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SearchableInput
            id="parent-category-list"
            label="Category"
            placeholder="Search or Create..."
            value={parentCategory}
            onChange={(val) => {
              setParentCategory(val);
              const newParent = categories.find(
                (c) => c.name.toLowerCase() === val.toLowerCase(),
              );
              if (!newParent) setSubCategory("");
            }}
            options={categories.map((c) => c.name)}
          />
          <SearchableInput
            id="sub-category-list"
            label="Subcategory"
            placeholder={
              parentCategory
                ? "Search or Create..."
                : "Select category first..."
            }
            value={subCategory}
            disabled={!parentCategory}
            onChange={setSubCategory}
            options={selectedParentData?.subcategories || []}
          />
        </div>

        {!initialData && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-600"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Make this a recurring transaction</span>
            </label>
            
            {isRecurring && (
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-top-2">
                  <div className="space-y-1">
                     <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Frequency</label>
                     <select 
                        value={frequency} 
                        onChange={(e) => setFrequency(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                     >
                        <option value="Daily">Daily</option>
                        <option value="Weekdays">Weekdays (Mon-Fri)</option>
                        <option value="Weekly">Weekly</option>
                        <option value="Monthly">Monthly</option>
                     </select>
                  </div>
                  <Input 
                     label="Time (Optional)" 
                     type="time" 
                     value={time} 
                     onChange={(e) => setTime(e.target.value)} 
                  />
               </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-6">
          <Button
            variant="ghost"
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : initialData ? "Update" : "Save"}{" "}
            {type === "expense" ? "Expense" : "Income"}
          </Button>
        </div>
      </form>
    </div>
  );
}
