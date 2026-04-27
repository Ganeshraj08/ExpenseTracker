import { createContext, useEffect, useState } from "react";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { auth, googleProvider } from "../services/firebase";
import { useToast } from "./ToastContext";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const loginWithGoogle = async () => {
    if (!auth) {
      addToast("Firebase is not configured yet! Please configure src/services/firebase.js first.", "error");
      return;
    }
    try {
      await signInWithPopup(auth, googleProvider);
      addToast("Successfully signed in", "success");
    } catch (error) {
      console.error("Error signing in with Google:", error);
      addToast("Error signing in", "error");
    }
  };

  const logout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      addToast("Signed out successfully", "success");
    } catch (error) {
      console.error("Error signing out:", error);
      addToast("Error signing out", "error");
    }
  };

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loginWithGoogle, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
