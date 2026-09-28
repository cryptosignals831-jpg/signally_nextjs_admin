import { Auth, getAuth, User } from '@firebase/auth';
import { Firestore, getFirestore } from '@firebase/firestore';
import { getApps, initializeApp } from 'firebase/app';
import { FirebaseStorage, getStorage } from 'firebase/storage';
import { getAnalytics, Analytics, isSupported } from 'firebase/analytics';
import { firebaseConfigClient } from '../constants/app_constants';
import { getDatabase } from 'firebase/database';

let authClient: Auth;
let firestoreClient: Firestore;
let storageClient: FirebaseStorage;
let analyticsClient: Analytics;
let realtimeDbClient: any;

export async function initializeFirebaseClient(): Promise<boolean> {
  const existingApps = getApps();
  const app = existingApps.length > 0 ? existingApps[0] : initializeApp(firebaseConfigClient);

  authClient = getAuth(app);
  firestoreClient = getFirestore(app);
  storageClient = getStorage(app);
  try {
    realtimeDbClient = getDatabase(app);
  } catch (_) {}

  try {
    if (typeof window !== 'undefined') {
      const supported = await isSupported().catch(() => false);
      if (supported) {
        analyticsClient = getAnalytics(app);
      }
    }
  } catch (_) {}

  return Promise.resolve(true);
}

export async function listenAuthStateChange(): Promise<User | null> {
  return new Promise((resolve) => {
    if (!authClient) {
      resolve(null);
      return;
    }
    const unsubscribe = authClient.onAuthStateChanged((user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

export { authClient, firestoreClient, storageClient, analyticsClient, realtimeDbClient };
