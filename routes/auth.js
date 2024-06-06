const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/user');
const router = express.Router();

// Configuring Nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // Generate a 6-digit OTP
};

const sendOTPEmail = (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your OTP Code',
    text: `Your OTP code is ${otp}`,
  };

  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error('Error sending email:', err);
        reject(err);
      } else {
        console.log('Email sent:', info.response);
        resolve(info);
      }
    });
  });
};

// Register Route
router.post('/register', async (req, res) => {
  const { email, password } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // OTP valid for 10 minutes

    user = new User({
      email,
      password: await bcrypt.hash(password, 10),
      otp: { code: otp, expiresAt: otpExpiresAt },
    });

    await user.save();
    await sendOTPEmail(email, otp);

    res.status(200).send('Verification email sent');
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).send('Server error');
  }
});

// Verify Route
// Verify Route
router.post('/verify', async (req, res) => {
    const { email, otp } = req.body;
  
    try {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ msg: 'Invalid credentials' });
      }
  
      // Check if the OTP object exists and has a valid code and expiry date
      if (!user.otp || user.otp.code !== otp || user.otp.expiresAt < Date.now()) {
        return res.status(400).json({ msg: 'Invalid or expired OTP' });
      }
  
      user.verified = true;
      user.otp = undefined; // Clear the OTP
      await user.save();
  
      res.status(200).send('Account verified');
    } catch (err) {
      console.error('Server error:', err);
      res.status(500).send('Server error');
    }
  });

  // Resend OTP Route
router.post('/resend-otp', async (req, res) => {
    const { email } = req.body;
  
    try {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ msg: 'User does not exist' });
      }
  
      const otp = generateOTP();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // OTP valid for 10 minutes
  
      user.otp = { code: otp, expiresAt: otpExpiresAt };
      await user.save();
      await sendOTPEmail(email, otp);
  
      res.status(200).send('OTP resent');
    } catch (err) {
      console.error('Server error:', err);
      res.status(500).send('Server error');
    }
  });
  
  

// Change Password Route
router.post('/change-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    if (user.otp.code !== otp || user.otp.expiresAt < Date.now()) {
      return res.status(400).json({ msg: 'Invalid or expired OTP' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.otp = undefined;
    await user.save();

    res.status(200).send('Password changed successfully');
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
