const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  updateNotificationSettings,
  logout,
  acceptInvite
} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validateRegister, validateLogin } = require('../middleware/validation');
const { authLimiter } = require('../middleware/rateLimiter');

// Public routes (with rate limiting)
router.post('/register', authLimiter, validateRegister, register);
router.post('/login', authLimiter, validateLogin, login);

// Invite onboarding route
router.post('/accept-invite', acceptInvite);

// Protected routes
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);
router.put('/password', authenticate, changePassword);
router.patch('/settings/notifications', authenticate, updateNotificationSettings);
router.post('/logout', authenticate, logout);

module.exports = router;
