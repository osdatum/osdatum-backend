import express from 'express';
import admin from 'firebase-admin';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import process from 'process';
import { readFileSync } from 'fs';

dotenv.config();

// Inisialisasi Firebase Admin hanya sekali
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


if (!admin.apps.length) {
  const serviceAccount = JSON.parse(
    readFileSync('/etc/secrets/serviceAccountKey.json', 'utf8')
  );
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}


const router = express.Router();

router.post('/', async (req, res) => {
  const { idToken, mode } = req.body;
  console.log('FirebaseAuth POST request received:', { 
    mode, 
    hasIdToken: !!idToken,
    body: req.body 
  });

  try {
    console.log('Verifying Firebase ID token...');
    const decoded = await admin.auth().verifyIdToken(idToken);
    console.log('Token verified successfully:', {
      email: decoded.email,
      uid: decoded.uid,
      hasName: !!decoded.name,
      hasPicture: !!decoded.picture
    });

    const { email, name, picture, uid } = decoded;

    // Get Firestore instance
    const db = admin.firestore();
    const usersRef = db.collection('users');
    // Check if user exists in Firestore
    console.log('Checking if user exists in Firestore...');
    const userDoc = await usersRef.where('email', '==', email).get();
    console.log('User exists in Firestore:', !userDoc.empty);

    if (userDoc.empty) {
      if (mode === 'register') {
        console.log('Creating new user in Firestore...');
        // Register: create new user in Firestore
        const newUser = {
          email: email || '',
          name: name || email?.split('@')[0] || 'User', // Use email username as fallback
          picture: picture || null,
          googleId: uid,
          subscriptionType: 'free',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        console.log('User data to be saved:', newUser);
        await usersRef.add(newUser);
        console.log('New user created successfully in Firestore');
      } else {
        console.log('Login attempt for non-registered user');
        return res.status(401).json({ error: 'Email belum terdaftar. Silakan register terlebih dahulu.' });
      }
    }

    // Sign custom JWT using the Firebase User ID (uid)
    console.log('Signing custom JWT...');
    const token = jwt.sign(
      { userId: uid, email: email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log('Signed custom JWT with userId:', uid);

    res.json({ 
      token,
      expiresIn: 3600, // 1 hour in seconds
      message: 'Token will expire in 1 hour'
    });
  } catch (error) {
    console.error('FirebaseAuth error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      name: error.name
    });
    
    // Check for specific error types
    if (error.code === 'auth/invalid-id-token') {
      return res.status(401).json({ error: 'Invalid ID token' });
    }
    
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'ID token has expired' });
    }
    
    res.status(500).json({ 
      error: 'Authentication failed',
      details: error.message 
    });
  }
});

export default router;
