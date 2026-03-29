import { useState, useMemo, useEffect } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { useCategories } from "../../context/CategoryContext";
import { Mic, Sparkles, Loader2 } from "lucide-react";
import { parseTransactionNLP } from "../../services/gemini";

function SearchableInput({ value, onChange, options, placeholder, disabled, label, id }) {
   return (
      <div className="space-y-1 w-full">
         <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
         <input
            type="text"
            list={id}
            disabled={disabled}
            value={value || ''}
            placeholder={placeholder}
            onChange={e => onChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-base sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 transition-colors"
         />
         <datalist id={id}>
            {options.map(opt => (
               <option key={opt} value={opt} />
            ))}
         </datalist>
         <p className="text-[10px] sm:text-xs text-slate-500 mt-1">Select from list or type to create new</p>
      </div>
   )
}

export function ExpenseForm({ onSubmit, onCancel, initialData = null }) {
   const { categories, addParentCategory, addSubcategory } = useCategories();

   const [amount, setAmount] = useState(initialData?.amount?.toString() || "");
   const [description, setDescription] = useState(initialData?.description || "");
   const [type, setType] = useState(initialData?.type || "expense");

   const [parentCategory, setParentCategory] = useState(initialData?.category?.split(':')[0]?.trim() || "");
   const [subCategory, setSubCategory] = useState(initialData?.category?.split(':')[1]?.trim() || "");

   const [isSubmitting, setIsSubmitting] = useState(false);
   const [aiParsing, setAiParsing] = useState(false);
   const [isListening, setIsListening] = useState(false);
   const [nlpText, setNlpText] = useState("");

   //   useEffect(() => {
   //      if (!initialData?.category && categories.length > 0 && !parentCategory) {
   //         setParentCategory(categories[0].name);
   //         if (categories[0].subcategories?.length > 0) {
   //            setSubCategory(categories[0].subcategories[0]);
   //         }
   //      }
   //   }, [categories, initialData, parentCategory]);

   const selectedParentData = useMemo(() => {
      return categories.find(c => c.name.toLowerCase() === parentCategory.toLowerCase()) || null;
   }, [categories, parentCategory]);

   const handleMagicAdd = async (text) => {
      if (!text || !text.trim()) return;
      setAiParsing(true);
      try {
         const categoryStrings = categories.map(c => {
            if (c.subcategories && c.subcategories.length > 0) {
               return `${c.name}: [${c.subcategories.join(', ')}]`;
            }
            return `${c.name}: []`;
         });

         const result = await parseTransactionNLP(text, categoryStrings);

         const data = result.data;
         if (data) {
            if (data.type) setType(data.type.toLowerCase() === 'income' ? 'income' : 'expense');
            if (data.amount) setAmount(data.amount.toString());
            if (data.description) setDescription(data.description);
            if (data.category && data.category.includes(':')) {
               const [p, s] = data.category.split(':');
               setParentCategory(p.trim());
               setSubCategory(s.trim());
            } else if (data.category) {
               setParentCategory(data.category.trim());
               setSubCategory("");
            }
         }
         setNlpText(""); // Clear after success
      } catch (err) {
         console.error("AI Parsing Error: ", err);
         alert("Sorry, AI couldn't parse that. Details: " + err.message);
      } finally {
         setAiParsing(false);
      }
   };

   const toggleVoice = () => {
      if (isListening) return;

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
         alert("Your browser does not support voice input.");
         return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
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
      let finalCategory = 'Uncategorized';

      if (currentParent) {
         finalCategory = currentParent;

         const pData = categories.find(c => c.name.toLowerCase() === currentParent.toLowerCase());
         if (!pData) {
            try {
               await addParentCategory(currentParent, currentSub);
               if (currentSub) finalCategory = `${currentParent}: ${currentSub}`;
            } catch (err) { console.error(err); }
         } else {
            finalCategory = pData.name;
            if (currentSub) {
               finalCategory = `${pData.name}: ${currentSub}`;
               const subExists = pData.subcategories?.some(s => s.toLowerCase() === currentSub.toLowerCase());
               if (!subExists) {
                  try {
                     await addSubcategory(pData.id, currentSub);
                  } catch (err) { console.error(err); }
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
            date: initialData?.date || new Date().toISOString()
         });
      } finally {
         setIsSubmitting(false);
      }
   };

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
                  Describe your transaction in plain English, and AI will fill out the form for you instantly.
               </p>

               {/* Responsive Container */}
               <div className="flex flex-col sm:flex-row gap-2 relative z-10">

                  {/* Input */}
                  <input
                     type="text"
                     className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                     placeholder="e.g. Spent $15 on Starbucks..."
                     value={nlpText}
                     onChange={e => setNlpText(e.target.value)}
                     onKeyDown={e => {
                        if (e.key === 'Enter') {
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
                        className={`flex-1 sm:flex-none justify-center transition-colors ${isListening
                              ? 'bg-red-50 text-red-600 border-red-200 animate-pulse'
                              : 'hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30'
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
                           'Parse'
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
                  className={`flex-1 py-2 rounded-lg text-base sm:text-sm font-medium transition-colors ${type === 'expense' ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                  onClick={() => setType('expense')}
               >
                  Expense
               </button>
               <button
                  type="button"
                  className={`flex-1 py-2 rounded-lg text-base sm:text-sm font-medium transition-colors ${type === 'income' ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                  onClick={() => setType('income')}
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
                     const newParent = categories.find(c => c.name.toLowerCase() === val.toLowerCase());
                     if (!newParent) setSubCategory("");
                  }}
                  options={categories.map(c => c.name)}
               />
               <SearchableInput
                  id="sub-category-list"
                  label="Subcategory"
                  placeholder={parentCategory ? "Search or Create..." : "Select category first..."}
                  value={subCategory}
                  disabled={!parentCategory}
                  onChange={setSubCategory}
                  options={selectedParentData?.subcategories || []}
               />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-6">
               <Button variant="ghost" type="button" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
               <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : (initialData ? 'Update' : 'Save')} {type === 'expense' ? 'Expense' : 'Income'}</Button>
            </div>
         </form>
      </div>
   );
}
