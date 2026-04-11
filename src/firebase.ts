// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase configuration — values are loaded from .env (never commit .env)
const requiredKeys = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
] as const;

const missingKeys = requiredKeys.filter((key) => !import.meta.env[key]);

if (missingKeys.length > 0) {
  console.error(
    `[TaskSync] Missing Firebase env vars: ${missingKeys.join(", ")}. ` +
      "Create .env from .env.example and restart the dev server."
  );
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "missing-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "missing-auth-domain",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "missing-project-id",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "missing-storage-bucket",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "missing-sender-id",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "missing-app-id",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
let analytics = null;
if (firebaseConfig.measurementId) {
  try {
    analytics = getAnalytics(app);
  } catch (error) {
    console.warn("[TaskSync] Firebase Analytics initialization skipped:", error);
  }
}
const auth = getAuth(app);
const db = getFirestore(app);

export { app, analytics, auth, db };
