import { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { useCategories } from "../../context/CategoryContext";
import { useExpenses } from "../../context/ExpenseContext";
import { useRecurringExpenses } from "../../context/RecurringExpenseContext";
import { useToast } from "../../context/ToastContext";
import { Mic, Sparkles, Loader2, Camera, X, ChevronDown } from "lucide-react";
import { parseTransactionNLP, parseReceiptImage } from "../../services/gemini";

function SearchableInput({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  label,
  id,
  required,
}) {
  return (
    <div className="space-y-1 w-full">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type="text"
        list={id}
        required={required}
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
  const formRef = useRef(null);
  const { categories, addParentCategory, addSubcategory } = useCategories();
  const { addExpense } = useExpenses();
  const { recurringExpenses, addRecurringExpense } = useRecurringExpenses();
  const { addToast } = useToast();

  const [showRoutineImport, setShowRoutineImport] = useState(false);

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
  const [pendingTransactions, setPendingTransactions] = useState([]); // Used for manual additions at bottom
  const [parsedTransactions, setParsedTransactions] = useState([]); // Used for Review Parsed Transactions redirect UI
  const [bundleTitle, setBundleTitle] = useState("");
  const [groupBundle, setGroupBundle] = useState(false);

  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState("Monthly");
  const [time, setTime] = useState("");

  const [receiptImage, setReceiptImage] = useState(initialData?.receiptImage || null);

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

      if (dataArray.length > 0) {
        setParsedTransactions(prev => [...prev, ...dataArray]);
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

  const handleImageUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

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

      const parsedResults = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const base64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement("canvas");
              const maxDim = 800;
              let width = img.width;
              let height = img.height;

              if (width > height) {
                if (width > maxDim) {
                  height *= maxDim / width;
                  width = maxDim;
                }
              } else {
                if (height > maxDim) {
                  width *= maxDim / height;
                  height = maxDim;
                }
              }
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext("2d");
              ctx.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL("image/jpeg", 0.7));
            };
            img.src = event.target.result;
          };
          reader.readAsDataURL(file);
        });

        const data = await parseReceiptImage(base64, "image/jpeg", validCategories);
        if (data) {
          data.receiptImage = base64;
          parsedResults.push(data);
        }
      }

      if (parsedResults.length === 0) {
        addToast("No receipts could be parsed.", "error");
      } else {
        setParsedTransactions((prev) => [...prev, ...parsedResults]);
        addToast(`${parsedResults.length} receipt(s) parsed successfully!`, "success");
      }
    } catch (err) {
      console.error("AI Receipt Parsing Error: ", err);
      addToast(
        "Sorry, AI couldn't parse the receipt(s). Details: " + err.message,
        "error"
      );
    } finally {
      setAiParsing(false);
      e.target.value = '';
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

  const processFormSubmit = async (keepOpen = false) => {
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
        receiptImage: receiptImage || null,
        date: initialData?.date || new Date().toISOString(),
      }, keepOpen);

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
         if (!keepOpen) addToast("Recurring scheduled!", "success");
      }

      if (keepOpen) {
          setAmount("");
          setDescription("");
          setReceiptImage(null);
          setIsRecurring(false);
          addToast("Transaction saved! Ready for the next one.", "success");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let allTransactions = [...pendingTransactions];
    if (amount && description && parentCategory) {
       allTransactions.unshift({
           amount,
           description,
           category: `${parentCategory}${subCategory ? ': ' + subCategory : ''}`,
           type,
           receiptImage: receiptImage || null,
           date: initialData?.date || new Date().toISOString(),
           isRecurring,
           frequency,
           time
       });
    } else if (allTransactions.length === 0) {
       addToast("Please enter an amount and description.", "error");
       return;
    }

    setIsSubmitting(true);
    let addedCount = 0;
    const sessionAddedParents = new Map();
    const sessionAddedSubs = new Map();
    const recurringItemsByFreq = {};

    try {
      for (const item of allTransactions) {
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

        await onSubmit({
          amount: parseFloat(item.amount),
          description: item.description,
          category: finalCategory,
          type: item.type?.toLowerCase() === "income" ? "income" : "expense",
          date: item.date || new Date().toISOString(),
          receiptImage: item.receiptImage || null,
        }, addedCount < allTransactions.length - 1);

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
               await addRecurringExpense({
                  title: item.description || "Routine",
                  frequency: item.frequency || "Monthly",
                  time: item.time || "",
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

      if (groupBundle) {
         for (const [freq, txs] of Object.entries(recurringItemsByFreq)) {
            await addRecurringExpense({
               title: bundleTitle.trim() ? bundleTitle : `Generated ${freq} Routine`,
               frequency: freq,
               time: "",
               lastExecuted: new Date().toLocaleDateString('en-CA'),
               transactions: txs
            });
         }
      }

      addToast("Transactions saved successfully!", "success");
      setPendingTransactions([]);
      setGroupBundle(false);
      setBundleTitle("");
    } catch (err) {
      console.error(err);
      addToast("Failed to save some transactions.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAndAddAnother = () => {
    if (formRef.current && !formRef.current.reportValidity()) return;

    setPendingTransactions(prev => [...prev, {
       amount,
       description,
       category: parentCategory ? `${parentCategory}${subCategory ? ': ' + subCategory : ''}` : '',
       type,
       receiptImage: receiptImage || null,
       date: initialData?.date || new Date().toISOString(),
       isRecurring,
       frequency: isRecurring ? frequency : null,
       time: time,
       id: Math.random()
    }]);

    setAmount("");
    setDescription("");
    setType("expense");
    setParentCategory("");
    setSubCategory("");
    setReceiptImage(null);
    setIsRecurring(false);
  };

  const handleImportRoutine = (routineId) => {
      if (!routineId) return;
      const routine = recurringExpenses.find(r => r.id === routineId);
      if (!routine) return;
      
      const newTxs = (routine.transactions || [{
         amount: routine.amount, description: routine.description, category: routine.category, type: routine.type
      }]).map(t => {
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
               category: t.category || "",
               type: t.type?.toLowerCase() === "income" ? "income" : "expense",
               id: Math.random()
         };
      });
      setParsedTransactions(prev => [...prev, ...newTxs]);
      setShowRoutineImport(false);
  };

  const handleSaveAllParsed = async () => {
    if (parsedTransactions.length === 0) return;
    setIsSubmitting(true);

    for (const item of parsedTransactions) {
      if (!item.amount || !item.description || !item.category) {
        addToast("Please fill in Amount, Description, and Category for all transactions.", "error");
        setIsSubmitting(false);
        return;
      }
    }

    let addedCount = 0;
    const sessionAddedParents = new Map();
    const sessionAddedSubs = new Map();
    const recurringItemsByFreq = {};

    try {
      for (const item of parsedTransactions) {
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
            sessionAddedParents.set(lowerParent, { id: "temp", name: currentParent, subcategories: currentSub ? [currentSub] : [] });
            if (currentSub) {
              sessionAddedSubs.set(lowerParent, new Set([currentSub.toLowerCase()]));
              finalCategory = `${currentParent}: ${currentSub}`;
            }
          } else {
            finalCategory = pData.name;
            if (currentSub) {
              finalCategory = `${pData.name}: ${currentSub}`;
              const lowerSub = currentSub.toLowerCase();
              let subExists = pData.subcategories?.some((s) => s.toLowerCase() === lowerSub) || sessionAddedSubs.get(lowerParent)?.has(lowerSub);

              if (!subExists) {
                if (pData.id !== "temp") await addSubcategory(pData.id, currentSub);
                if (!sessionAddedSubs.has(lowerParent)) sessionAddedSubs.set(lowerParent, new Set());
                sessionAddedSubs.get(lowerParent).add(lowerSub);
              }
            }
          }
        }

        await onSubmit({
          amount: parseFloat(item.amount),
          description: item.description,
          category: finalCategory,
          type: item.type?.toLowerCase() === "income" ? "income" : "expense",
          date: item.date || new Date().toISOString(),
          receiptImage: item.receiptImage || null,
        }, addedCount < parsedTransactions.length - 1);
        
        if (item.isRecurring) {
            if (groupBundle) {
               const freq = item.frequency || "Monthly";
               if (!recurringItemsByFreq[freq]) recurringItemsByFreq[freq] = [];
               recurringItemsByFreq[freq].push({ amount: parseFloat(item.amount), description: item.description || "Routine Item", category: finalCategory, type: item.type?.toLowerCase() === "income" ? "income" : "expense" });
            } else {
               await addRecurringExpense({ title: item.description || "Routine", frequency: item.frequency || "Monthly", time: item.time || "", lastExecuted: new Date().toLocaleDateString('en-CA'), transactions: [{ amount: parseFloat(item.amount), description: item.description || "Routine Item", category: finalCategory, type: item.type?.toLowerCase() === "income" ? "income" : "expense" }] });
            }
        }
        addedCount++;
      }
      
      if (groupBundle) {
         for (const [freq, txs] of Object.entries(recurringItemsByFreq)) {
            await addRecurringExpense({ title: bundleTitle.trim() ? bundleTitle : `Imported ${freq} Routine`, frequency: freq, time: "", lastExecuted: new Date().toLocaleDateString('en-CA'), transactions: txs });
         }
      }

      addToast("Transactions saved successfully!", "success");
      setParsedTransactions([]);
      setGroupBundle(false);
      setBundleTitle("");
    } catch (err) {
      console.error(err);
      addToast("Failed to save some transactions.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (parsedTransactions.length > 0) {
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 dark:bg-slate-800 p-4 rounded-xl border border-blue-100 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
            Review Parsed Transactions
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            We found {parsedTransactions.length} transactions. Review them
            before saving.
          </p>
        </div>

        <div className="max-h-96 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
          {parsedTransactions.map((tx, idx) => {
             const parentCat = tx.category ? tx.category.split(":")[0].trim() : "";
             const subCat = tx.category && tx.category.includes(":") ? tx.category.split(":")[1].trim() : "";
             const parentOptions = categories.map(c => c.name);
             const subOptions = categories.find(c => c.name === parentCat)?.subcategories || [];

             return (
            <div key={idx} className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm relative group animate-in slide-in-from-bottom-2 transition-all space-y-3">
               <div className="absolute top-3 right-3 z-10 flex gap-2">
                  <button type="button" onClick={() => {
                        const newTx = [...parsedTransactions];
                        newTx[idx].type = tx.type === "income" ? "expense" : "income";
                        setParsedTransactions(newTx);
                     }}
                     className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${tx.type === "income" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}
                  >
                     {tx.type}
                  </button>
                  {parsedTransactions.length > 1 && (
                     <button type="button" onClick={() => setParsedTransactions(prev => prev.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-red-500 opacity-50 group-hover:opacity-100 transition-opacity p-0.5 bg-white dark:bg-slate-900 rounded">
                        <X className="w-4 h-4" />
                     </button>
                  )}
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pr-16">
                  <Input label="Amount" type="number" step="0.01" value={tx.amount || ""} onChange={(e) => { const newTx = [...parsedTransactions]; newTx[idx].amount = e.target.value; setParsedTransactions(newTx); }} required placeholder="0.00" />
                  <Input label="Description" type="text" value={tx.description || ""} onChange={(e) => { const newTx = [...parsedTransactions]; newTx[idx].description = e.target.value; setParsedTransactions(newTx); }} required placeholder="e.g. Coffee" />
                  
                  <div className="space-y-1">
                     <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
                     <div className="relative">
                        <select value={parentCat} onChange={(e) => { 
                           const p = e.target.value;
                           const newTx = [...parsedTransactions]; 
                           newTx[idx].category = p; 
                           setParsedTransactions(newTx); 
                        }} className="appearance-none w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 pr-8 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer text-ellipsis">
                           <option value="">Select Category</option>
                           {parentOptions.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                     </div>
                  </div>

                  <div className="space-y-1">
                     <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Subcategory</label>
                     <div className="relative">
                        <select value={subCat} onChange={(e) => { 
                           const s = e.target.value;
                           const newTx = [...parsedTransactions]; 
                           newTx[idx].category = `${parentCat}: ${s}`;
                           setParsedTransactions(newTx); 
                        }} disabled={!parentCat || subOptions.length === 0} className="appearance-none w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 pr-8 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-50 text-ellipsis">
                           <option value="">Select Subcategory</option>
                           {subOptions.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                     </div>
                  </div>
               </div>

                <div className="flex items-center gap-3 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                   <label className="flex items-center gap-1.5 cursor-pointer group">
                      <input type="checkbox" checked={tx.isRecurring || false} onChange={(e) => { setParsedTransactions(prev => prev.map((p, i) => i === idx ? { ...p, isRecurring: e.target.checked, frequency: p.frequency || 'Monthly' } : p)); }} className="rounded text-blue-600 focus:ring-blue-500 bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-600" />
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300 group-hover:text-blue-600 transition-colors">Recurring</span>
                   </label>
                   
                   {tx.isRecurring && (
                      <div className="relative">
                        <select value={tx.frequency || "Monthly"} onChange={(e) => { setParsedTransactions(prev => prev.map((p, i) => i === idx ? { ...p, frequency: e.target.value } : p)); }} className="appearance-none rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-2 pr-6 py-0.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer">
                           <option value="Daily">Daily</option>
                           <option value="Weekdays">Weekdays</option>
                           <option value="Weekly">Weekly</option>
                           <option value="Monthly">Monthly</option>
                        </select>
                        <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                   )}
                </div>
            </div>
          )})}
          
          <div className="p-2 border-t border-slate-100 dark:border-slate-800 flex justify-center">
             <button type="button" onClick={() => { setParsedTransactions(prev => [...prev, { amount: "", description: "", parentCategory: "", subCategory: "", category: "", type: "expense", id: Math.random() }]); }} className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
                + Add Transaction
             </button>
          </div>
        </div>
        
        {parsedTransactions.some(tx => tx.isRecurring) && (
           <div className="bg-white dark:bg-slate-900 p-4 mt-4 rounded-lg border border-slate-200 dark:border-slate-700 w-full animate-in fade-in slide-in-from-bottom-2">
              <label className="flex items-start gap-2.5 cursor-pointer mb-2">
                 <input type="checkbox" checked={groupBundle} onChange={(e) => setGroupBundle(e.target.checked)} className="mt-1 rounded text-blue-600 focus:ring-blue-500 bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-600" />
                 <div>
                    <span className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Group into a single Routine bundle</span>
                    <span className="block text-xs text-slate-500 mt-0.5">Check this if all items belong to one event. Uncheck to create separate routines.</span>
                 </div>
              </label>
              {groupBundle && (
                 <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 mt-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Bundle Title (Optional)</label>
                    <input type="text" value={bundleTitle} onChange={e => setBundleTitle(e.target.value)} placeholder="e.g. Office Commute" className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                 </div>
              )}
           </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-6">
          <Button variant="ghost" type="button" onClick={() => setParsedTransactions([])} disabled={isSubmitting}>Cancel</Button>
          <Button type="button" disabled={isSubmitting || parsedTransactions.length === 0} onClick={handleSaveAllParsed}>
            {isSubmitting ? "Saving..." : `Save All ${parsedTransactions.length}`}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!initialData && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800/80 p-4 rounded-xl border border-blue-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <Sparkles className="w-16 h-16 text-blue-600" />
          </div>

          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-500" /> Magic Add & Import
            </h3>
            {recurringExpenses?.length > 0 && (
              <button type="button" onClick={() => setShowRoutineImport(!showRoutineImport)} className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-md hover:bg-indigo-100 transition-colors border border-indigo-100 dark:border-indigo-800/50">
                 {showRoutineImport ? "Cancel Import" : "Import Routine"}
              </button>
            )}
          </div>

          {showRoutineImport && recurringExpenses?.length > 0 && (
             <div className="mb-4 relative animate-in fade-in slide-in-from-top-2 z-20">
                <select onChange={(e) => handleImportRoutine(e.target.value)} value="" className="appearance-none w-full rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-900/20 px-3 pr-8 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer">
                   <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Select Routine to Import...</option>
                   {recurringExpenses.map(r => <option key={r.id} value={r.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{r.title || r.description}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 text-indigo-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
             </div>
          )}

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

              {/* Camera Button */}
              <label
                className={`flex-1 sm:flex-none justify-center inline-flex items-center text-sm font-medium rounded-lg px-4 border shadow-sm transition-colors cursor-pointer ${
                  aiParsing
                    ? "opacity-50 cursor-not-allowed bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={aiParsing}
                />
                <Camera className="w-4 h-4" />
              </label>

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
          {receiptImage && (
            <div className="mt-3 relative inline-block animate-in fade-in zoom-in group">
              <img src={receiptImage} alt="Receipt preview" className="h-16 w-16 object-cover rounded-md border border-slate-200 dark:border-slate-700" />
              <button
                type="button"
                onClick={() => setReceiptImage(null)}
                className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
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
            required
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
                  <div className="space-y-1 relative">
                     <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Frequency</label>
                     <div className="relative">
                       <select 
                          value={frequency} 
                          onChange={(e) => setFrequency(e.target.value)}
                          className="appearance-none w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 pr-8 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                       >
                          <option value="Daily">Daily</option>
                          <option value="Weekdays">Weekdays (Mon-Fri)</option>
                          <option value="Weekly">Weekly</option>
                          <option value="Monthly">Monthly</option>
                       </select>
                       <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                     </div>
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

        {pendingTransactions.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-bottom-2">
            <h4 className="text-sm font-semibold mb-4 text-slate-800 dark:text-slate-200">
              Additional Transactions ({pendingTransactions.length})
            </h4>
            <div className="space-y-6">
              {pendingTransactions.map((tx, idx) => {
                 const parentCat = tx.category ? tx.category.split(":")[0]?.trim() : "";
                 const subCat = tx.category && tx.category.includes(":") ? tx.category.split(":")[1]?.trim() : "";
                 const pData = categories.find(c => c.name.toLowerCase() === parentCat.toLowerCase());

                 return (
                   <div key={idx} className="relative p-4 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 rounded-xl space-y-4 shadow-sm group">
                     <button type="button" onClick={() => setPendingTransactions(prev => prev.filter((_, i) => i !== idx))} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 bg-white dark:bg-slate-900 p-1.5 rounded-full shadow-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                       <X className="w-4 h-4" />
                     </button>
                     <div className="flex gap-4 mb-4 pr-12">
                       <button type="button" className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${tx.type === "expense" ? "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400" : "bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"}`} onClick={() => { const newTx = [...pendingTransactions]; newTx[idx].type = "expense"; setPendingTransactions(newTx); }}>Expense</button>
                       <button type="button" className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${tx.type === "income" ? "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400" : "bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"}`} onClick={() => { const newTx = [...pendingTransactions]; newTx[idx].type = "income"; setPendingTransactions(newTx); }}>Income</button>
                     </div>
                     <Input label="Amount" type="number" step="0.01" placeholder="0.00" value={tx.amount || ""} onChange={(e) => { const newTx = [...pendingTransactions]; newTx[idx].amount = e.target.value; setPendingTransactions(newTx); }} required />
                     <Input label="Description" type="text" placeholder="What was this for?" value={tx.description || ""} onChange={(e) => { const newTx = [...pendingTransactions]; newTx[idx].description = e.target.value; setPendingTransactions(newTx); }} required />
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <SearchableInput id={`parent-category-${idx}`} label="Category" placeholder="Search or Create..." value={parentCat} required onChange={(val) => { const newTx = [...pendingTransactions]; newTx[idx].category = val; setPendingTransactions(newTx); }} options={categories.map(c => c.name)} />
                       <SearchableInput id={`sub-category-${idx}`} label="Subcategory" placeholder={parentCat ? "Search or Create..." : "Select category first..."} disabled={!parentCat} value={subCat} onChange={(val) => { const newTx = [...pendingTransactions]; newTx[idx].category = `${parentCat}: ${val}`; setPendingTransactions(newTx); }} options={pData?.subcategories || []} />
                     </div>
                   </div>
                 );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end items-center gap-3 pt-6 border-t border-slate-100 dark:border-slate-800 mt-8">
          {!initialData && (
             <Button
               variant="ghost"
               type="button"
               className="mr-auto text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium"
               disabled={isSubmitting}
               onClick={handleSaveAndAddAnother}
             >
               + Add Item
             </Button>
          )}
          <Button
            variant="ghost"
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : initialData ? "Update" : `Save All ${pendingTransactions.length > 0 ? `(${pendingTransactions.length + (amount && description ? 1 : 0)})` : ''}`}
          </Button>
        </div>
      </form>
    </div>
  );
}
