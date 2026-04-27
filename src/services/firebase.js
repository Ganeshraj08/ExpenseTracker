// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

// TODO: Replace this with your app's Firebase project configuration
// 1. Go to Firebase Console: https://console.firebase.google.com/
// 2. Add a new project or select an existing one
// 3. Register a "Web App"
// 4. Go to Authentication -> Sign-in Method -> Enable "Google"
// 5. Go to Firestore Database -> Create database
// 6. Copy the config object and replace the below object:

const firebaseConfig = {
  apiKey: "AIzaSyAjmXa55xIavQhUXbzOTG1AV0v25-JHjKU",
  authDomain: "expense-tracker-12b67.firebaseapp.com",
  projectId: "expense-tracker-12b67",
  storageBucket: "expense-tracker-12b67.firebasestorage.app",
  messagingSenderId: "1097643597320",
  appId: "1:1097643597320:web:cd245ebf7ca49fcc55bbbd",
};

// Initialize Firebase (wrapped in try-catch to avoid crashing if config is placeholder)
let app;
let auth;
let db;
let functions;
let googleProvider;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  functions = getFunctions(app);
  googleProvider = new GoogleAuthProvider();
} catch (error) {
  console.warn(
    "Firebase is not configured properly. Please update it in src/services/firebase.js",
  );
}

export { auth, db, functions, googleProvider };
