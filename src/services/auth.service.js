import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase.config';

export const authService = {
  // Register new user
  register: async (email, password, userData) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        ...userData,
        email: user.email,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        achievements: [],
        progress: {},
      });

      // Send email verification
      try {
        await sendEmailVerification(user);
      } catch (emailError) {
        console.log('Email verification failed:', emailError.message);
        // Don't fail registration if email verification fails
      }
      
      return { success: true, user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Login user
  login: async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update last login timestamp
      await setDoc(doc(db, 'users', user.uid), { lastLogin: new Date().toISOString() }, { merge: true });

      return { success: true, user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Logout user
  logout: async () => {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get current user
  getCurrentUser: () => {
    return auth.currentUser;
  },

  // Listen to auth state changes
  onAuthStateChange: (callback) => {
    return onAuthStateChanged(auth, callback);
  },

  // Get user profile from Firestore
  getUserProfile: async (userId) => {
    try {
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { success: true, data: docSnap.data() };
      } else {
        return { success: false, error: 'User profile not found' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Forgot password
  forgotPassword: async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};
