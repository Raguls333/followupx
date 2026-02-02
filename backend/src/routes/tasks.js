const express = require('express');
const router = express.Router();
const {
  getTasks,
  getTodaysDashboard,
  getTask,
  createTask,
  updateTask,
  completeTask,
  rescheduleTask,
  snoozeTask,
  deleteTask,
  getTaskStats
} = require('../controllers/taskController');
const { authenticate } = require('../middleware/auth');
const { validateCreateTask, validateUpdateTask, validateCompleteTask, validateMongoId } = require('../middleware/validation');

// All routes require authentication
router.use(authenticate);

// Task routes
router.get('/', getTasks);
router.get('/today', getTodaysDashboard);
router.get('/stats', getTaskStats);
router.post('/', validateCreateTask, createTask);

// Individual task routes
router.get('/:id', validateMongoId, getTask);
router.put('/:id', validateUpdateTask, updateTask);
router.patch('/:id/complete', validateCompleteTask, completeTask);
router.patch('/:id/reschedule', validateMongoId, rescheduleTask);
router.patch('/:id/snooze', validateMongoId, snoozeTask);
router.delete('/:id', validateMongoId, deleteTask);

module.exports = router;
