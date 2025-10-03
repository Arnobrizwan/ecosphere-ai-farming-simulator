// For Firebase JS SDK v7.20.0 and later, measurementId is optional
import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

// Use Expo's Constants for environment variables
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  geminiApiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY,
  geminiModel: process.env.EXPO_PUBLIC_GEMINI_MODEL,
  translateApiKey: process.env.EXPO_PUBLIC_GOOGLE_TRANSLATE_API_KEY
};

// Validate Firebase config
const validateConfig = () => {
  const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'appId'];
  const missingKeys = requiredKeys.filter(key => !firebaseConfig[key]);

  if (missingKeys.length > 0) {
    console.error('❌ Missing Firebase configuration:', missingKeys);
    console.error('Firebase Config:', firebaseConfig);
    throw new Error(`Missing Firebase config: ${missingKeys.join(', ')}`);
  }

  console.log('✅ Firebase configuration validated');
};

// Validate before initializing
validateConfig();

// Initialize Firebase
let app;
let auth;
let db;
let rtdb;
let storage;

try {
  if (getApps().length === 0) {
    console.log('🔥 Initializing Firebase...');
    app = initializeApp(firebaseConfig);
    console.log('✅ Firebase app initialized');
  } else {
    app = getApps()[0];
    console.log('✅ Using existing Firebase app');
  }

  // Initialize Firebase services
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage)
    });
    console.log('✅ Firebase Auth initialized');
  } catch (authError) {
    // Auth might already be initialized
    if (authError.code === 'auth/already-initialized') {
      auth = getAuth(app);
      console.log('✅ Using existing Firebase Auth');
    } else {
      throw authError;
    }
  }

  db = getFirestore(app);
  console.log('✅ Firestore initialized');

  rtdb = getDatabase(app);
  console.log('✅ Realtime Database initialized');

  storage = getStorage(app);
  console.log('✅ Storage initialized');
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  throw error;
}

export { auth, db, rtdb, storage };
export default app;
