const express = require('express');
const router = express.Router();
const {
  getLeadActivities,
  createActivity,
  getActivityTimeline,
  getActivityStats,
  logCall,
  logNote
} = require('../controllers/activityController');
const { authenticate } = require('../middleware/auth');
const { validateCreateActivity, validateMongoId } = require('../middleware/validation');

// All routes require authentication
router.use(authenticate);

// Activity routes
router.get('/timeline', getActivityTimeline);
router.get('/stats', getActivityStats);
router.post('/', validateCreateActivity, createActivity);
router.post('/call', logCall);
router.post('/note', logNote);

// Lead-specific activities
router.get('/lead/:leadId', getLeadActivities);

module.exports = router;
