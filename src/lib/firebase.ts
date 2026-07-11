// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { setLogLevel } from 'firebase/app';
// Import storage for profile photos
import { getStorage } from 'firebase/storage';

// Suppress non-critical Firestore warnings in production
// The "Failed to obtain primary lease" warning is expected with multi-tab support
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  setLogLevel('error'); // Only show errors, not warnings
}

// Filter out the "Failed to obtain primary lease" warning in development
// This is a non-critical informational message about multi-tab coordination
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    const message = args.join(' ');
    if (message.includes('Failed to obtain primary lease')) {
      // Suppress this specific warning - it's expected behavior with multi-tab support
      return;
    }
    originalWarn.apply(console, args);
  };
}

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDhXudvlYIi7nugjPGI-WduR8fQPcaoIeo",
  authDomain: "hrms-82eb5.firebaseapp.com",
  projectId: "hrms-82eb5",
  storageBucket: "hrms-82eb5.firebasestorage.app",
  messagingSenderId: "268490657476",
  appId: "1:268490657476:web:0a58aaf00618366b4b8391",
  measurementId: "G-DBXEKF1V8G"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);

// Initialize Firestore with persistent local cache for offline support.
// Uses the default WebSocket/gRPC transport for fastest real-time performance.
// The SDK will auto-fallback to long-polling if WebSocket is blocked.
// NOTE: experimentalForceLongPolling was REMOVED — it was causing extreme
// slowness on mobile devices by forcing repeated HTTP round-trips instead
// of maintaining a fast persistent WebSocket connection.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export default app;