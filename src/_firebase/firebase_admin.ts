import * as admin from 'firebase-admin';

function getPrivateKey(): string {
  let key = process.env.FIREBASE_PRIVATE_KEY || '';
  key = key.trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\n/g, '\n');
}

export const firebaseConfigServer = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  get privateKey() {
    return getPrivateKey();
  }
};

function getApp(): admin.app.App {
  if (admin.apps.length > 0) return admin.apps[0]!;

  const key = getPrivateKey();
  if (key && process.env.FIREBASE_CLIENT_EMAIL) {
    try {
      return admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: key
        })
      });
    } catch (e) {
      console.error('Error initializing Firebase Admin with cert:', e);
    }
  }

  return admin.initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  });
}

const app = getApp();

const authAdmin: admin.auth.Auth = admin.auth(app);
const firestoreAdmin: admin.firestore.Firestore = admin.firestore(app);

export { firestoreAdmin, authAdmin };
