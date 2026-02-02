const express = require('express');
const router = express.Router();
const {
  getOverview,
  getFunnel,
  getActivityAnalytics,
  getRevenue,
  exportData,
  getDashboard
} = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/auth');
const { exportLimiter } = require('../middleware/rateLimiter');

// All routes require authentication
router.use(authenticate);

// Analytics routes
router.get('/dashboard', getDashboard);
router.get('/overview', getOverview);
router.get('/funnel', getFunnel);
router.get('/activities', getActivityAnalytics);
router.get('/revenue', getRevenue);
router.get('/export', exportLimiter, exportData);

module.exports = router;
