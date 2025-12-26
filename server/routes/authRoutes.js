const express = require('express');


const router = express.Router();
const {
  register,
  login,
  verifyOtp,
  forgotPassword,
  resetPassword,
  resendOtp
} = require('../controller/authController');


// Public
router.post('/register', register);
router.post('/verify', verifyOtp);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/resend', resendOtp);

// Needs auth token from recovery session
router.post('/reset-password', resetPassword);

module.exports = router;
