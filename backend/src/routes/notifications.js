const express = require('express');
const router = express.Router();
const {
  getNotifications,
  getUnread,
  markAsRead,
  markAllRead,
  deleteNotification,
  clearAll,
  getCount
} = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');
const { validateMongoId } = require('../middleware/validation');

// All routes require authentication
router.use(authenticate);

// Notification routes
router.get('/', getNotifications);
router.get('/unread', getUnread);
router.get('/count', getCount);
router.patch('/mark-all-read', markAllRead);
router.delete('/clear-all', clearAll);

// Individual notification routes
router.patch('/:id/read', validateMongoId, markAsRead);
router.delete('/:id', validateMongoId, deleteNotification);

module.exports = router;
