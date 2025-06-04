import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import admin from 'firebase-admin';

const router = express.Router();

router.post('/grid', authenticateToken, async (req, res) => {
  try {
    const { gridId } = req.body;
    const userId = req.user.userId;

    // Get Firestore instance
    const db = admin.firestore();
    const usersRef = db.collection('users');

    // Get user document
    const userQuery = await usersRef.where('googleId', '==', userId).get();
    
    if (userQuery.empty) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userDoc = userQuery.docs[0];
    const userData = userDoc.data();

    // Check if user already has this grid
    if (userData.purchasedGrids && userData.purchasedGrids.includes(gridId)) {
      return res.status(400).json({ error: 'Grid already purchased' });
    }

    // Update user's purchased grids
    await userDoc.ref.update({
      purchasedGrids: admin.firestore.FieldValue.arrayUnion(gridId),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ message: 'Grid purchased successfully' });
  } catch (error) {
    console.error('Purchase error:', error);
    res.status(500).json({ error: 'Purchase failed' });
  }
});

export default router;
