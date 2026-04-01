import { createContext, useContext, useState, useEffect } from "react";
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { useAuth } from "../hooks/useAuth";

export const RecurringExpenseContext = createContext();

export function RecurringExpenseProvider({ children }) {
  const { user } = useAuth();
  const [recurringExpenses, setRecurringExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRecurringExpenses([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "recurring_expenses"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setRecurringExpenses(data);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Error (Recurring Expenses):", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const addRecurringExpense = async (expenseData) => {
    if (!user) throw new Error("Must be logged in to add recurring expenses");
    try {
      await addDoc(collection(db, "recurring_expenses"), {
        ...expenseData,
        userId: user.uid,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error adding recurring expense:", error);
      throw error;
    }
  };

  const updateRecurringExpense = async (id, updatedData) => {
    try {
      const docRef = doc(db, "recurring_expenses", id);
      await updateDoc(docRef, updatedData);
    } catch (error) {
      console.error("Error updating recurring expense:", error);
      throw error;
    }
  };

  const deleteRecurringExpense = async (id) => {
    try {
      await deleteDoc(doc(db, "recurring_expenses", id));
    } catch (error) {
      console.error("Error deleting recurring expense:", error);
      throw error;
    }
  };

  return (
    <RecurringExpenseContext.Provider value={{ 
      recurringExpenses, 
      loading, 
      addRecurringExpense, 
      updateRecurringExpense, 
      deleteRecurringExpense 
    }}>
      {children}
    </RecurringExpenseContext.Provider>
  );
}

export const useRecurringExpenses = () => useContext(RecurringExpenseContext);
