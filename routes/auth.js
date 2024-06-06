const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/user');
const router = express.Router();

// Function to send verification email
const sendVerificationEmail = (user, req, res) => {
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: 'Account Verification Code',
    text: `Your verification code is ${user.verificationCode}`,
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error sending verification email');
    } else {
      res.status(200).send('Verification email sent');
    }
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

    const verificationCode = crypto.randomBytes(3).toString('hex');

    user = new User({
      email,
      password: await bcrypt.hash(password, 10),
      verificationCode,
    });

    await user.save();

    sendVerificationEmail(user, req, res);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Login Route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    if (!user.verified) {
      return res.status(400).json({ msg: 'Account not verified' });
    }

    const payload = {
      user: {
        id: user.id,
      },
    };

    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
      if (err) throw err;
      res.json({ token });
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Verify Route
router.post('/verify', async (req, res) => {
  const { email, verificationCode } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || user.verificationCode !== verificationCode) {
      return res.status(400).json({ msg: 'Invalid verification code' });
    }

    user.verified = true;
    user.verificationCode = null;
    await user.save();

    res.status(200).send('Account verified');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
