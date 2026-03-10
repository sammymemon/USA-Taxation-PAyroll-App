import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// Replace these with actual values from Firebase console
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDummyApiKeyPlaceholder123",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "payroll-qa.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "payroll-qa",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "payroll-qa.appspot.com",
    messagingSenderId: import.meta.env.VITE_FIREBASE_SENDER_ID || "123456789",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef123456"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
