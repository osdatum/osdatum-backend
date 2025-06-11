import admin from 'firebase-admin';
import { readFileSync } from 'fs';
// import serviceAccount from '../../serviceAccountKey.json' with { type: 'json' }; // Added import attribute

if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8')
  );
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
    // Anda bisa tambahkan konfigurasi lain seperti databaseURL, storageBucket jika diperlukan
  });
}

export const firestore = admin.firestore();
export const auth = admin.auth(); // Ekspor auth juga jika belum diinisialisasi di tempat lain 