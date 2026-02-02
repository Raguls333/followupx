const Task = require('../models/Task');
const Lead = require('../models/Lead');
const Activity = require('../models/Activity');
const { scheduleReminder, cancelReminder } = require('../config/agenda');

// Helper: Generate AI-powered next task suggestions
const generateAISuggestion = (task, outcome) => {
  const suggestions = {
    'no_answer': {
      type: 'whatsapp',
      title: `Send WhatsApp follow-up to {{LeadName}}`,
      description: 'They didn\'t pick up. Send a friendly message.',
      dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      priority: 'medium',
      suggestedTemplate: 'follow_up_no_response'
    },
    'voicemail': {
      type: 'whatsapp',
      title: `Send WhatsApp to {{LeadName}}`,
      description: 'They have voicemail. Follow up via WhatsApp.',
      dueDate: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour from now
      priority: 'high',
      suggestedTemplate: 'follow_up_no_response'
    },
    'busy': {
      type: 'call',
      title: `Call {{LeadName}} back`,
      description: 'They were busy. Try calling again later.',
      dueDate: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
      priority: 'medium'
    },
    'connected_positive': {
      type: 'whatsapp',
      title: `Send proposal to {{LeadName}}`,
      description: 'They showed interest! Send them the proposal.',
      dueDate: new Date(new Date().setDate(new Date().getDate() + 1)), // Next day at same time
      priority: 'high',
      suggestedTemplate: 'send_proposal'
    },
    'connected_needs_followup': {
      type: 'call',
      title: `Follow-up call with {{LeadName}}`,
      description: 'They need more info. Plan a follow-up call.',
      dueDate: new Date(new Date().setDate(new Date().getDate() + 3)), // 3 days later
      priority: 'medium'
    },
    'interested_not_ready': {
      type: 'whatsapp',
      title: `Check in with {{LeadName}}`,
      description: 'They\'re interested but not ready. Stay in touch.',
      dueDate: new Date(new Date().setDate(new Date().getDate() + 7)), // 1 week
      priority: 'low',
      suggestedTemplate: 'check_in'
    }
  };

  return suggestions[outcome] || null;
};

// @desc    Get all tasks
// @route   GET /api/tasks
// @access  Private
const getTasks = async (req, res, next) => {
  try {
    const {
      status,
      type,
      leadId,
      assignedTo,
      startDate,
      endDate,
      sort = 'dueDate',
      page = 1,
      limit = 20
    } = req.query;

    // Build query
    const query = { userId: req.user._id };

    if (status) {
      query.status = status;
    }

    if (type) {
      query.type = type;
    }

    if (leadId) {
      query.leadId = leadId;
    }

    if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    if (startDate || endDate) {
      query.dueDate = {};
      if (startDate) query.dueDate.$gte = new Date(startDate);
      if (endDate) query.dueDate.$lte = new Date(endDate);
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const [tasks, total] = await Promise.all([
      Task.find(query)
        .populate('leadId', 'name phone company status')
        .populate('assignedTo', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Task.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        tasks,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get today's dashboard
// @route   GET /api/tasks/today
// @access  Private
const getTodaysDashboard = async (req, res, next) => {
  try {
    const dashboard = await Task.getTodaysDashboard(req.user._id);

    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private
const getTask = async (req, res, next) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user._id
    })
      .populate('leadId', 'name phone email company status')
      .populate('assignedTo', 'name email');

    if (!task) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Task not found',
          code: 'NOT_FOUND'
        }
      });
    }

    res.json({
      success: true,
      data: {
        task
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create task
// @route   POST /api/tasks
// @access  Private
const createTask = async (req, res, next) => {
  try {
    const {
      title,
      type,
      description,
      priority,
      leadId,
      dueDate,
      dueTime,
      reminderAt,
      assignedTo
    } = req.body;

    // Verify lead exists and belongs to user
    const lead = await Lead.findOne({
      _id: leadId,
      userId: req.user._id,
      isDeleted: false
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Lead not found',
          code: 'LEAD_NOT_FOUND'
        }
      });
    }

    // Create task
    const task = await Task.create({
      userId: req.user._id,
      leadId,
      title,
      type: type || 'follow_up',
      description,
      priority: priority || 'medium',
      dueDate: new Date(dueDate),
      dueTime,
      reminderAt: reminderAt ? new Date(reminderAt) : null,
      assignedTo: assignedTo || req.user._id
    });

    // Schedule reminder if set
    if (task.reminderAt && task.reminderAt > new Date()) {
      const jobId = await scheduleReminder(
        task._id.toString(),
        req.user._id.toString(),
        leadId.toString(),
        task.reminderAt
      );
      task.agendaJobId = jobId;
      await task.save();
    }

    // Update lead's nextFollowUpAt if this is the earliest pending task
    const earliestTask = await Task.findOne({
      leadId,
      status: 'pending'
    }).sort({ dueDate: 1 });

    if (earliestTask) {
      lead.nextFollowUpAt = earliestTask.dueDate;
      await lead.save();
    }

    // Log activity
    await Activity.log({
      userId: req.user._id,
      leadId,
      type: 'task_created',
      title: `Task created: ${title}`,
      description: `${type} task scheduled for ${new Date(dueDate).toLocaleDateString()}`,
      taskId: task._id,
      metadata: { taskType: type }
    });

    // Populate for response
    await task.populate('leadId', 'name phone company status');

    res.status(201).json({
      success: true,
      data: {
        task
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
const updateTask = async (req, res, next) => {
  try {
    const {
      title,
      type,
      description,
      priority,
      dueDate,
      dueTime,
      reminderAt
    } = req.body;

    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Task not found',
          code: 'NOT_FOUND'
        }
      });
    }

    // Can only update pending tasks
    if (task.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Cannot update a completed or cancelled task',
          code: 'TASK_NOT_EDITABLE'
        }
      });
    }

    // Update fields
    if (title) task.title = title;
    if (type) task.type = type;
    if (description !== undefined) task.description = description;
    if (priority) task.priority = priority;
    if (dueDate) task.dueDate = new Date(dueDate);
    if (dueTime !== undefined) task.dueTime = dueTime;

    // Handle reminder changes
    if (reminderAt !== undefined) {
      // Cancel old reminder
      if (task.agendaJobId) {
        await cancelReminder(task.agendaJobId);
        task.agendaJobId = null;
        task.reminderSent = false;
      }

      // Schedule new reminder if set
      if (reminderAt && new Date(reminderAt) > new Date()) {
        task.reminderAt = new Date(reminderAt);
        const jobId = await scheduleReminder(
          task._id.toString(),
          req.user._id.toString(),
          task.leadId.toString(),
          task.reminderAt
        );
        task.agendaJobId = jobId;
      } else {
        task.reminderAt = null;
      }
    }

    await task.save();

    // Update lead's nextFollowUpAt
    const lead = await Lead.findById(task.leadId);
    if (lead) {
      const earliestTask = await Task.findOne({
        leadId: task.leadId,
        status: 'pending'
      }).sort({ dueDate: 1 });

      lead.nextFollowUpAt = earliestTask ? earliestTask.dueDate : null;
      await lead.save();
    }

    await task.populate('leadId', 'name phone company status');

    res.json({
      success: true,
      data: {
        task
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Complete task
// @route   PATCH /api/tasks/:id/complete
// @access  Private
const completeTask = async (req, res, next) => {
  try {
    const { outcome, outcomeNotes, createFollowUp } = req.body;

    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Task not found',
          code: 'NOT_FOUND'
        }
      });
    }

    if (task.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Task is already completed or cancelled',
          code: 'TASK_NOT_PENDING'
        }
      });
    }

    // Cancel reminder if exists
    if (task.agendaJobId) {
      await cancelReminder(task.agendaJobId);
    }

    // Update task
    task.status = 'completed';
    task.completedAt = new Date();
    task.outcome = outcome;
    task.outcomeNotes = outcomeNotes;
    await task.save();

    // Update lead's lastContactedAt
    const lead = await Lead.findById(task.leadId);
    if (lead) {
      lead.lastContactedAt = new Date();

      // Update nextFollowUpAt
      const nextTask = await Task.findOne({
        leadId: task.leadId,
        status: 'pending',
        _id: { $ne: task._id }
      }).sort({ dueDate: 1 });

      lead.nextFollowUpAt = nextTask ? nextTask.dueDate : null;
      await lead.save();
    }

    // Log activity
    await Activity.log({
      userId: req.user._id,
      leadId: task.leadId,
      type: 'task_completed',
      title: `Task completed: ${task.title}`,
      description: outcomeNotes || `Outcome: ${outcome || 'Not specified'}`,
      taskId: task._id,
      metadata: { outcome, taskType: task.type }
    });

    // Create follow-up task if requested
    let followUpTask = null;
    if (createFollowUp && lead) {
      const followUpDate = new Date();
      followUpDate.setDate(followUpDate.getDate() + (req.user.settings?.defaultFollowUpDays || 3));

      followUpTask = await Task.create({
        userId: req.user._id,
        leadId: task.leadId,
        title: `Follow up: ${lead.fullName}`,
        type: 'follow_up',
        description: `Follow-up from previous ${task.type}`,
        dueDate: followUpDate,
        priority: task.priority
      });

      // Update lead's nextFollowUpAt
      lead.nextFollowUpAt = followUpDate;
      await lead.save();
    }

    await task.populate('leadId', 'name phone company status fullName');

    // Generate AI suggestion for next task
    const aiSuggestion = generateAISuggestion(task, outcome);
    let processedSuggestion = null;

    if (aiSuggestion && lead) {
      // Replace {{LeadName}} and other placeholders
      processedSuggestion = {
        ...aiSuggestion,
        title: aiSuggestion.title.replace('{{LeadName}}', lead.fullName || lead.name)
      };
    }

    res.json({
      success: true,
      data: {
        task,
        followUpTask,
        aiSuggestion: processedSuggestion // AI-powered suggestion for next task
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reschedule task
// @route   PATCH /api/tasks/:id/reschedule
// @access  Private
const rescheduleTask = async (req, res, next) => {
  try {
    const { newDueDate, reason } = req.body;

    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Task not found',
          code: 'NOT_FOUND'
        }
      });
    }

    if (task.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Cannot reschedule a completed or cancelled task',
          code: 'TASK_NOT_PENDING'
        }
      });
    }

    const oldDueDate = task.dueDate;
    task.dueDate = new Date(newDueDate);
    task.overdueNotified = false; // Reset overdue notification

    // Reschedule reminder if exists
    if (task.agendaJobId) {
      await cancelReminder(task.agendaJobId);
      task.agendaJobId = null;
    }

    if (task.reminderAt && new Date(newDueDate) > new Date()) {
      // Set new reminder relative to new due date
      const timeDiff = task.reminderAt.getTime() - oldDueDate.getTime();
      task.reminderAt = new Date(new Date(newDueDate).getTime() + timeDiff);
      task.reminderSent = false;

      if (task.reminderAt > new Date()) {
        const jobId = await scheduleReminder(
          task._id.toString(),
          req.user._id.toString(),
          task.leadId.toString(),
          task.reminderAt
        );
        task.agendaJobId = jobId;
      }
    }

    await task.save();

    // Update lead's nextFollowUpAt
    const lead = await Lead.findById(task.leadId);
    if (lead) {
      const earliestTask = await Task.findOne({
        leadId: task.leadId,
        status: 'pending'
      }).sort({ dueDate: 1 });

      lead.nextFollowUpAt = earliestTask ? earliestTask.dueDate : null;
      await lead.save();
    }

    // Log activity
    await Activity.log({
      userId: req.user._id,
      leadId: task.leadId,
      type: 'task_rescheduled',
      title: `Task rescheduled: ${task.title}`,
      description: reason || `Rescheduled to ${new Date(newDueDate).toLocaleDateString()}`,
      taskId: task._id,
      metadata: { oldDueDate, newDueDate, reason }
    });

    await task.populate('leadId', 'name phone company status');

    res.json({
      success: true,
      data: {
        task
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Snooze task reminder
// @route   PATCH /api/tasks/:id/snooze
// @access  Private
const snoozeTask = async (req, res, next) => {
  try {
    const { minutes = 30 } = req.body;

    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Task not found',
          code: 'NOT_FOUND'
        }
      });
    }

    if (task.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Cannot snooze a completed or cancelled task',
          code: 'TASK_NOT_PENDING'
        }
      });
    }

    // Cancel old reminder
    if (task.agendaJobId) {
      await cancelReminder(task.agendaJobId);
    }

    // Set new reminder
    const newReminderAt = new Date(Date.now() + minutes * 60 * 1000);
    task.reminderAt = newReminderAt;
    task.reminderSent = false;

    const jobId = await scheduleReminder(
      task._id.toString(),
      req.user._id.toString(),
      task.leadId.toString(),
      newReminderAt
    );
    task.agendaJobId = jobId;

    await task.save();

    res.json({
      success: true,
      message: `Reminder snoozed for ${minutes} minutes`,
      data: {
        task
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete/cancel task
// @route   DELETE /api/tasks/:id
// @access  Private
const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Task not found',
          code: 'NOT_FOUND'
        }
      });
    }

    // Cancel reminder if exists
    if (task.agendaJobId) {
      await cancelReminder(task.agendaJobId);
    }

    // Set status to cancelled instead of deleting
    task.status = 'cancelled';
    await task.save();

    // Update lead's nextFollowUpAt
    const lead = await Lead.findById(task.leadId);
    if (lead) {
      const nextTask = await Task.findOne({
        leadId: task.leadId,
        status: 'pending'
      }).sort({ dueDate: 1 });

      lead.nextFollowUpAt = nextTask ? nextTask.dueDate : null;
      await lead.save();
    }

    // Log activity
    await Activity.log({
      userId: req.user._id,
      leadId: task.leadId,
      type: 'task_cancelled',
      title: `Task cancelled: ${task.title}`,
      taskId: task._id
    });

    res.json({
      success: true,
      message: 'Task cancelled successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get task stats
// @route   GET /api/tasks/stats
// @access  Private
const getTaskStats = async (req, res, next) => {
  try {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const [statusCounts, typeCounts, overdueTasks] = await Promise.all([
      // Count by status
      Task.aggregate([
        { $match: { userId: req.user._id } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      // Count by type (pending only)
      Task.aggregate([
        { $match: { userId: req.user._id, status: 'pending' } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]),
      // Overdue count
      Task.countDocuments({
        userId: req.user._id,
        status: 'pending',
        dueDate: { $lt: todayStart }
      })
    ]);

    const byStatus = {};
    statusCounts.forEach(s => {
      byStatus[s._id] = s.count;
    });

    const byType = {};
    typeCounts.forEach(t => {
      byType[t._id] = t.count;
    });

    res.json({
      success: true,
      data: {
        byStatus,
        byType,
        overdue: overdueTasks,
        total: Object.values(byStatus).reduce((a, b) => a + b, 0)
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
