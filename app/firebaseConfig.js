import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCsjjHsfH35wQLV08EnUwHh4r3VEZOG0_Y",
  authDomain: "code-60831.firebaseapp.com",
  databaseURL: "https://code-60831-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "code-60831",
  storageBucket: "code-60831.appspot.com",
  messagingSenderId: "444419260299",
  appId: "1:444419260299:web:0c9bb01e73ace435c0398e",
  measurementId: "G-8HVKYJ4VC8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize and export Firebase services
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
