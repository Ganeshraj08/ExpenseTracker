import { createContext, useContext, useState, useEffect } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { useAuth } from "../hooks/useAuth";

export const UserPreferencesContext = createContext();

export function UserPreferencesProvider({ children }) {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState({ geminiApiKey: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPreferences({ geminiApiKey: "" });
      setLoading(false);
      return;
    }

    const docRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setPreferences(docSnap.data());
      } else {
        setPreferences({ geminiApiKey: "" });
      }
      setLoading(false);
    }, (error) => {
      console.error("Firestore Error Fetching Preferences:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const updatePreferences = async (newPrefs) => {
    if (!user) throw new Error("Must be logged in");
    try {
      await setDoc(doc(db, "users", user.uid), newPrefs, { merge: true });
    } catch (error) {
      console.error("Error updating preferences:", error);
      throw error;
    }
  };

  return (
    <UserPreferencesContext.Provider value={{ preferences, loading, updatePreferences }}>
      {children}
    </UserPreferencesContext.Provider>
  );
}

export const useUserPreferences = () => useContext(UserPreferencesContext);
