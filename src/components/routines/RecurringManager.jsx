import { useEffect, useRef } from "react";
import { useRecurringExpenses } from "../../context/RecurringExpenseContext";
import { useExpenses } from "../../context/ExpenseContext";
import { useModal } from "../../context/ModalContext";
import { useToast } from "../../context/ToastContext";

export function RecurringManager() {
  const { recurringExpenses, updateRecurringExpense } = useRecurringExpenses();
  const { addExpense } = useExpenses();
  const { confirm } = useModal();
  const { addToast } = useToast();
  
  // Track processed ones this session so we don't spam multiple times if context updates
  const processedRef = useRef(new Set());

  useEffect(() => {
    if (!recurringExpenses || recurringExpenses.length === 0) return;

    const checkRecurring = async () => {
      const now = new Date();
      // Format: YYYY-MM-DD
      const todayString = now.toLocaleDateString('en-CA'); 
      const currentDay = now.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
      const currentDate = now.getDate();
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();

      for (const expense of recurringExpenses) {
        if (processedRef.current.has(expense.id)) continue;
        
        // Skip if already executed or explicitly skipped today
        if (expense.lastExecuted === todayString || (expense.lastSkipped === todayString && !processedRef.current.has(expense.id))) continue;

        let isDue = false;

        // Check Frequency
        switch (expense.frequency) {
          case "Daily":
            isDue = true;
            break;
          case "Weekdays":
            if (currentDay >= 1 && currentDay <= 5) isDue = true;
            break;
          case "Weekly": {
            // Check if today matches the same day it was created
            const createdDate = new Date(expense.createdAt);
            if (currentDay === createdDate.getDay()) isDue = true;
            break;
          }
          case "Monthly": {
             const createdDate = new Date(expense.createdAt);
             // handle e.g. 31st on a 30-day month
             const d1 = createdDate.getDate();
             const d2 = now.getDate();
             // simple logic: wait until the date matches. If today is the date, fire.
             // If month doesn't have the date (e.g. Feb 30), we fire on the last day of month.
             const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
             const targetDate = Math.min(d1, lastDayOfMonth);
             
             if (d2 === targetDate) isDue = true;
             // also if we missed it (e.g. didn't open app), we might want to check if lastExecuted < targetDate this month
             // For simplicity, we just trigger if it's currently due today.
             break;
          }
          default:
            isDue = false;
        }

        if (!isDue) continue;

        // Check Time
        if (expense.time) {
          const [expHour, expMin] = expense.time.split(":").map(Number);
          // If current time hasn't passed target time yet today, skip it for now.
          if (currentHour < expHour || (currentHour === expHour && currentMin < expMin)) {
            continue;
          }
        }

        // It is due and time has passed. We process it.
        processedRef.current.add(expense.id);

        // Backward compatibility
        const transactions = expense.transactions || [{
           amount: expense.amount,
           description: expense.description,
           category: expense.category,
           type: expense.type
        }];
        
        const routineTitle = expense.title || expense.description || "Routine";
        const totalAmount = transactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

        // Prompt
        const accepted = await confirm({
           title: "Routine Due",
           message: `Do you want to log routine "${routineTitle}" (Total: ₹${totalAmount.toFixed(2)}, ${transactions.length} items)?`,
           confirmText: "Log Routine",
           cancelText: "Skip for today"
        });
        
        if (accepted) {
           try {
              for (const t of transactions) {
                  await addExpense({
                    amount: parseFloat(t.amount),
                    category: t.category || "Uncategorized",
                    description: t.description || 'Routine Item',
                    type: t.type || 'expense',
                    date: new Date().toISOString()
                  });
              }
              await updateRecurringExpense(expense.id, { lastExecuted: todayString });
              addToast(`Logged routine: ${routineTitle}`, "success");
           } catch(error) {
              console.error("Error adding routine expense", error);
              addToast("Error logging routine", "error");
           }
        } else {
           // Skipped, update lastSkipped so it doesn't nag us again today, but is NOT marked as logged
           await updateRecurringExpense(expense.id, { lastSkipped: todayString });
        }

      }
    };

    checkRecurring();
    
    // Set up an interval to check periodically (e.g., every 1 minute) for time-based triggers
    const interval = setInterval(checkRecurring, 60000);
    
    return () => clearInterval(interval);

  }, [recurringExpenses, addExpense, updateRecurringExpense, confirm, addToast]);

  return null; // This component has no UI
}
