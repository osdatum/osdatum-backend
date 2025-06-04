import express from "express";
import jwt from "jsonwebtoken";
import { firestore } from "../firebase/firestore.js";
import { auth } from "../firebase/firestore.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Mock database untuk menyimpan purchased grids
const purchasedGrids = new Map(); // userId -> [gridIds]

// Middleware untuk verifikasi token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

// Get user access level
router.get("/access", authenticateToken, async (req, res) => {
  const userId = req.user ? req.user.uid : null;

  if (!userId) {
    console.log("[Access Endpoint] No userId found in request");
    return res.status(401).json({
      access: "free",
      purchasedGrids: [],
      error: "User not authenticated via middleware",
    });
  }

  try {
    console.log(
      `[Access Endpoint] Fetching access and purchased grids for userId: ${userId}`
    );

    // Get the purchases collection for this user
    const purchasesRef = firestore
      .collection("users")
      .doc(userId)
      .collection("purchases");
    console.log(
      `[Access Endpoint] Querying Firestore path: users/${userId}/purchases`
    );

    const purchasesSnap = await purchasesRef.get();
    console.log(
      `[Access Endpoint] Firestore query returned ${purchasesSnap.size} documents`
    );

    const purchasedGrids = purchasesSnap.docs.map((doc) => {
      console.log(`[Access Endpoint] Found purchased grid: ${doc.id}`);
      return doc.id;
    });

    console.log(
      `[Access Endpoint] Found ${purchasedGrids.length} purchased grids for user ${userId}:`,
      purchasedGrids
    );

    res.json({
      access: purchasedGrids.length > 0 ? "purchased" : "free",
      purchasedGrids: purchasedGrids,
    });
  } catch (err) {
    console.error(
      "[Access Endpoint] Error fetching user access and purchased grids:",
      err
    );
    res
      .status(500)
      .json({ error: "Failed to fetch user access and purchased grids." });
  }
});

// Purchase grid
router.post("/purchase/grid", authenticateToken, async (req, res) => {
  const { gridId } = req.body;

  if (!gridId) {
    return res.status(400).json({ error: "Grid ID is required" });
  }

  const userId = req.user.uid;

  console.log(
    `[Purchase Endpoint] Received gridId: ${gridId}, userId: ${userId}`
  );
  console.log(
    `[Purchase Endpoint] Type of gridId: ${typeof gridId}, Type of userId: ${typeof userId}`
  );

  try {
    console.log(
      `[Purchase Endpoint] Purchase attempt (in userRoutes) for userId: ${userId}, gridId: ${gridId}`
    );

    const gridIdString = String(gridId);
    console.log(`[Purchase Endpoint] Using gridId as string: ${gridIdString}`);

    const purchaseRef = firestore
      .collection("users")
      .doc(userId)
      .collection("purchases")
      .doc(gridIdString);
    const doc = await purchaseRef.get();

    if (doc.exists) {
      console.log(
        `[Purchase Endpoint] Grid ${gridIdString} already purchased by user ${userId} (in userRoutes).`
      );
      return res.status(400).json({ error: "Grid already purchased" });
    }

    console.log(
      `[Purchase Endpoint] Writing purchase data (in userRoutes) for user ${userId}, gridId ${gridIdString} to Firestore.`
    );
    await purchaseRef.set({
      purchaseDate: new Date(),
      status: "success",
    });
    console.log(
      `[Purchase Endpoint] Successfully wrote purchase data (in userRoutes) for user ${userId}, gridId ${gridIdString} to Firestore.`
    );

    res.json({ success: true, gridId: gridIdString });
  } catch (err) {
    console.error(
      "[Purchase Endpoint] Error purchasing grid (in userRoutes):",
      err
    );
    res.status(500).json({ error: "Failed to purchase grid" });
  }
});

// Subscribe to plan
router.post("/subscribe", authenticateToken, (req, res) => {
  const { planType } = req.body;

  if (!planType || !["monthly", "yearly"].includes(planType)) {
    return res.status(400).json({ error: "Invalid plan type" });
  }

  console.log(
    `[Subscribe Endpoint] User ${req.user.uid} subscribed to ${planType} plan.`
  );
  res.json({ success: true });
});

export default router;
