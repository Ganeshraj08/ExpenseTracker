import { createContext, useContext, useState, useEffect } from "react";
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { useAuth } from "../hooks/useAuth";

export const CategoryContext = createContext();

const DEFAULT_CATEGORIES = [
  { name: 'Housing', subcategories: ['Rent', 'Mortgage', 'Utilities', 'Maintenance', 'Furnishing'] },
  { name: 'Transportation', subcategories: ['Fuel', 'Public Transit', 'Auto Repair', 'Parking', 'Tolls'] },
  { name: 'Food', subcategories: ['Groceries', 'Restaurants', 'Coffee/Snacks', 'Delivery'] },
  { name: 'Personal Care', subcategories: ['Hair/Nails', 'Cosmetics', 'Medical', 'Gym/Fitness'] },
  { name: 'Entertainment', subcategories: ['Movies', 'Subscriptions', 'Events', 'Hobbies', 'Games'] },
  { name: 'Education', subcategories: ['Tuition', 'Books', 'Supplies', 'Courses'] },
  { name: 'Financial', subcategories: ['Taxes', 'Insurance', 'Investments', 'Bank Fees'] },
  { name: 'Income', subcategories: ['Salary', 'Freelance', 'Investments', 'Gifts'] }
];

export function CategoryProvider({ children }) {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCategories([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "categories"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      let data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => a.name.localeCompare(b.name));
      
      // If user has absolutely no categories, seed them
      if (data.length === 0 && !snapshot.metadata.hasPendingWrites) {
         try {
           for (const cat of DEFAULT_CATEGORIES) {
              await addDoc(collection(db, "categories"), {
                ...cat,
                userId: user.uid,
                createdAt: new Date().toISOString()
              });
           }
         } catch (error) {
           console.error("Error seeding default categories:", error);
         }
      } else {
         setCategories(data);
      }
      
      setLoading(false);
    }, (error) => {
      console.error("Firestore Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const addParentCategory = async (name, initialSubcategory = null) => {
    if (!user) throw new Error("Must be logged in");
    try {
      const subcategories = initialSubcategory ? [initialSubcategory.trim()] : [];
      await addDoc(collection(db, "categories"), {
        name: name.trim(),
        subcategories,
        userId: user.uid,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
       console.error("Error adding parent category", error);
       throw error;
    }
  };

  const updateParentCategory = async (categoryId, newName) => {
     try {
       const catRef = doc(db, "categories", categoryId);
       await updateDoc(catRef, { name: newName.trim() });
     } catch (error) {
       console.error("Error updating parent category", error);
       throw error;
     }
  };

  const deleteParentCategory = async (categoryId) => {
     try {
       await deleteDoc(doc(db, "categories", categoryId));
     } catch(error) {
       console.error("Error deleting parent category", error);
       throw error;
     }
  };

  const addSubcategory = async (categoryId, subcategoryName) => {
     try {
        const cat = categories.find(c => c.id === categoryId);
        if (!cat) throw new Error("Category not found");
        
        let subcategories = cat.subcategories || [];
        if (!subcategories.includes(subcategoryName.trim())) {
           subcategories = [...subcategories, subcategoryName.trim()];
        }
        
        const catRef = doc(db, "categories", categoryId);
        await updateDoc(catRef, { subcategories });
     } catch (error) {
        console.error("Error adding subcategory", error);
        throw error;
     }
  };

  const updateSubcategory = async (categoryId, oldSub, newSub) => {
     try {
        const cat = categories.find(c => c.id === categoryId);
        if (!cat) throw new Error("Category not found");
        
        let subcategories = cat.subcategories || [];
        const index = subcategories.indexOf(oldSub);
        if (index > -1) {
           subcategories[index] = newSub.trim();
        }
        
        const catRef = doc(db, "categories", categoryId);
        await updateDoc(catRef, { subcategories });
     } catch (error) {
        console.error("Error updating subcategory", error);
        throw error;
     }
  };

  const deleteSubcategory = async (categoryId, subcategoryName) => {
     try {
        const cat = categories.find(c => c.id === categoryId);
        if (!cat) throw new Error("Category not found");
        
        let subcategories = cat.subcategories || [];
        subcategories = subcategories.filter(s => s !== subcategoryName);
        
        const catRef = doc(db, "categories", categoryId);
        await updateDoc(catRef, { subcategories });
     } catch (error) {
        console.error("Error deleting subcategory", error);
        throw error;
     }
  };

  return (
    <CategoryContext.Provider value={{
       categories,
       loading,
       addParentCategory,
       updateParentCategory,
       deleteParentCategory,
       addSubcategory,
       updateSubcategory,
       deleteSubcategory
    }}>
      {children}
    </CategoryContext.Provider>
  );
}

export const useCategories = () => useContext(CategoryContext);
