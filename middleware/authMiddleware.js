import jwt from 'jsonwebtoken'; // Import jsonwebtoken
// import { auth } from '../firebase/firestore.js'; // No longer needed for verifying our custom JWT

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token == null) {
    // If no token, return unauthorized
    console.log('Authentication failed: No token provided'); // Log added
    return res.sendStatus(401); 
  }

  try {
    // Wrap jwt.verify in a Promise to use await
    const decoded = await new Promise((resolve, reject) => {
      /*global process*/ // Allow process.env
      jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, decodedToken) => {
        if (err) {
          return reject(err);
        }
        resolve(decodedToken);
      });
    });

    // Attach user info to the request object
    // Ensure decoded contains userId from your custom JWT payload
    if (!decoded || !decoded.userId) {
        console.error('Authentication failed: Token payload missing userId');
        return res.sendStatus(403); // Forbidden if payload doesn't have userId
    }

    // Convert userId to string explicitly before attaching to req.user
    const userIdString = String(decoded.userId); // Ensure userId is a string
    console.log(`Authentication successful for userId: ${userIdString} (as string)`); // Log the string version

    req.user = { uid: userIdString }; // Attach the string userId
    next(); // Proceed to the next middleware/route handler

  } catch (error) {
    // This catch block will handle errors from jwt.verify (like invalid signature, expired) and other sync errors
    console.error('Authentication failed: Invalid token or unexpected error', error.message);
    res.sendStatus(403); // Forbidden for invalid tokens
  }
}; 