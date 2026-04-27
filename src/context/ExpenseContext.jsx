import { createContext, useContext, useState, useEffect } from "react";
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, getDocs, writeBatch, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { useAuth } from "../hooks/useAuth";

export const ExpenseContext = createContext();

export function ExpenseProvider({ children }) {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setExpenses([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "expenses"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => new Date(b.date) - new Date(a.date));
      setExpenses(data);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Error:", error);
      // Wait for indexing if that's the error
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const addExpense = async (expenseData) => {
    if (!user) throw new Error("Must be logged in to add expenses");
    try {
      await addDoc(collection(db, "expenses"), {
        ...expenseData,
        userId: user.uid,
        date: expenseData.date || new Date().toISOString(),
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error adding expense:", error);
      throw error;
    }
  };

  const updateExpense = async (id, updatedData) => {
    try {
      const expenseRef = doc(db, "expenses", id);
      await updateDoc(expenseRef, updatedData);
    } catch (error) {
      console.error("Error updating expense:", error);
      throw error;
    }
  };

  const batchUpdateParentCategory = async (oldParent, newParent) => {
    if (!user) return;
    try {
      const q = query(collection(db, "expenses"), where("userId", "==", user.uid));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      let updateCount = 0;
      
      snapshot.forEach(d => {
         const cat = d.data().category || "";
         if (cat === oldParent || cat.startsWith(`${oldParent}: `)) {
            const newCat = cat.replace(oldParent, newParent);
            batch.update(d.ref, { category: newCat });
            updateCount++;
         }
      });
      
      if(updateCount > 0) {
         await batch.commit();
      }
    } catch (error) {
      console.error("Error batch updating parent category:", error);
      throw error;
    }
  };

  const batchUpdateSubcategory = async (parent, oldSub, newSub) => {
    if (!user) return;
    try {
      const oldFullName = `${parent}: ${oldSub}`;
      const newFullName = `${parent}: ${newSub}`;
      const q = query(collection(db, "expenses"), where("userId", "==", user.uid), where("category", "==", oldFullName));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      
      if(!snapshot.empty) {
         snapshot.forEach(d => {
            batch.update(d.ref, { category: newFullName });
         });
         await batch.commit();
      }
    } catch (error) {
      console.error("Error batch updating subcategory:", error);
      throw error;
    }
  };

  const deleteExpense = async (id) => {
    try {
      await deleteDoc(doc(db, "expenses", id));
    } catch (error) {
       console.error("Error deleting expense:", error);
       throw error;
    }
  };

  const clearAllData = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, "expenses"), where("userId", "==", user.uid));
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      querySnapshot.forEach((document) => {
        batch.delete(document.ref);
      });
      await batch.commit();
    } catch (error) {
      console.error("Error clearing data:", error);
      throw error;
    }
  };

  return (
    <ExpenseContext.Provider value={{ expenses, loading, addExpense, updateExpense, batchUpdateParentCategory, batchUpdateSubcategory, deleteExpense, clearAllData }}>
      {children}
    </ExpenseContext.Provider>
  );
}

export const useExpenses = () => useContext(ExpenseContext);
