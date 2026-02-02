const express = require('express');
const router = express.Router();

const {
  getScheduledMessages,
  getUpcomingMessages,
  getMessageStats,
  createScheduledMessage,
  updateScheduledMessage,
  cancelScheduledMessage
} = require('../controllers/scheduledMessageController');

const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Get statistics
router.get('/stats', getMessageStats);

// Get upcoming messages (next 7 days)
router.get('/upcoming', getUpcomingMessages);

// Get all scheduled messages
router.get('/', getScheduledMessages);

// Create scheduled message
router.post('/', createScheduledMessage);

// Update scheduled message
router.put('/:id', updateScheduledMessage);

// Cancel scheduled message
router.delete('/:id', cancelScheduledMessage);

module.exports = router;
