import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import admin from "firebase-admin";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./api/auth.js";
import userRoutes from "./api/user.js"; // Contains /access, /purchase/grid, /subscribe
import firebaseAuthRoutes from "./routes/firebaseAuth.js";
import { authenticateToken } from "./middleware/authMiddleware.js";
import subscriptionRoutes from "./routes/subscription.js";
import { readFileSync } from 'fs';

// Initialize Firebase Admin
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));
    
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

console.log("OSDATUM Backend Starting...");

// Load environment variables
dotenv.config();

const app = express();

app.use(cors({
  origin: 'https://osdatum.vercel.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// CORS configuration
const whitelist = [
  'http://localhost:5173',
  'https://osdatum-app.vercel.app',
  'https://osdatum-app.onrender.com',
  'https://*.vercel.app'  // Allow all Vercel preview deployments
];

const corsOptions = {
  origin(origin, cb) {
    // allow requests with no Origin (e.g. mobile apps, curl) as well
    if (!origin || whitelist.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Access-Control-Allow-Origin'],
  optionsSuccessStatus: 204        // some legacy browsers expect 200-level
};

// 1 – global CORS for every route
app.use(cors(corsOptions));

// 2 – explicit pre-flight fallback (Express 5 needs a named or wrapped star)
app.options('*', cors(corsOptions));   // '(.)' works, '*' does not




app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", authenticateToken, userRoutes); // Apply authenticateToken to all user routes
app.use("/api/auth/firebase", firebaseAuthRoutes);
app.use("/api/subscription", subscriptionRoutes);



// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  const origin = req.headers.origin;
  const whitelist = [
    'http://localhost:5173',
    'hattps://osdatum.vercel.app',
    'https://osdatum-app.vercel.app',
    'https://osdatum-app.onrender.com',
    'https://*.vercel.app'  // Allow all Vercel preview deployments
  ];
  if (origin && whitelist.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.status(500).json({ error: "Something broke!" });
});

// Start server
/*global process*/ // Allow process.env
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

