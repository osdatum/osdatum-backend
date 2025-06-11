import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import transporter from '../config/emailConfig.js';
import dotenv from 'dotenv';
import admin from 'firebase-admin';

dotenv.config();

const router = express.Router();

// Route untuk subscription yang memerlukan autentikasi
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { email, name } = req.body;
    const adminEmail = process.env.EMAIL_USER;

    // Get Firestore instance
    const db = admin.firestore();
    const usersRef = db.collection('users');

    // Update user subscription in Firestore
    const userQuery = await usersRef.where('email', '==', email).get();
    
    if (userQuery.empty) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userDoc = userQuery.docs[0];
    await userDoc.ref.update({
      subscriptionType: 'subscription',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Send email notification
    const mailOptions = {
      from: adminEmail,
      to: email,
      subject: 'Subscription Confirmation',
      html: `
        <h1>Welcome to OSDATUM Subscription!</h1>
        <p>Dear ${name},</p>
        <p>Thank you for subscribing to our service. You now have access to all premium features.</p>
        <p>Best regards,<br>OSDATUM Team</p>
      `
    };

    await transporter.sendMail(mailOptions);

    res.json({ message: 'Subscription successful' });
  } catch (error) {
    console.error('Subscription error:', error);
    res.status(500).json({ error: 'Subscription failed' });
  }
});

// Route untuk apply subscription yang tidak memerlukan autentikasi
router.post('/apply', async (req, res) => {
  console.log('Received subscription request:', req.body);
  try {
    const { firstName, lastName, email, instansi, jobTitle, keperluan } = req.body;
    const adminEmail = process.env.EMAIL_USER;
    
    console.log('Processing request for:', { firstName, lastName, email, instansi, jobTitle, keperluan });
    console.log('Admin email:', adminEmail);

    // Email untuk admin
    const adminMailOptions = {
      from: adminEmail,
      to: adminEmail,
      subject: 'New Full Access Request',
      html: `
        <h2>New Full Access Request</h2>
        <p><strong>Name:</strong> ${firstName} ${lastName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Institution:</strong> ${instansi}</p>
        <p><strong>Job Title:</strong> ${jobTitle}</p>
        <p><strong>Purpose:</strong> ${keperluan}</p>
      `
    };

    // Email konfirmasi untuk user
    const userMailOptions = {
      from: adminEmail,
      to: email,
      subject: 'OSDATUM Full Access Request Received',
      html: `
        <h2>Thank you for your interest in OSDATUM Full Access</h2>
        <p>Dear ${firstName} ${lastName},</p>
        <p>We have received your request for full access to OSDATUM data. Our team will review your application and get back to you soon.</p>
        <p>Here's a summary of your request:</p>
        <ul>
          <li><strong>Institution:</strong> ${instansi}</li>
          <li><strong>Job Title:</strong> ${jobTitle}</li>
          <li><strong>Purpose:</strong> ${keperluan}</li>
        </ul>
        <p>If you have any questions, please don't hesitate to contact us at ${adminEmail}</p>
        <p>Best regards,<br>The OSDATUM Team</p>
      `
    };

    console.log('Sending emails...');
    // Kirim email
    await transporter.sendMail(adminMailOptions);
    await transporter.sendMail(userMailOptions);
    console.log('Emails sent successfully');

    res.json({ success: true, message: 'Request submitted successfully' });
  } catch (error) {
    console.error('Error processing subscription request:', error);
    res.status(500).json({ success: false, error: 'Failed to process request' });
  }
});

export default router;
