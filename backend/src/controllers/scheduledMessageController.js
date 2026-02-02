const { ScheduledMessage } = require('../models');
const { AppError } = require('../middleware/errorHandler');

// @desc    Get all scheduled messages for user
// @route   GET /api/scheduled-messages
// @access  Private
const getScheduledMessages = async (req, res, next) => {
  try {
    const { status, type, limit = 20, skip = 0 } = req.query;
    
    // Build filter
    const filter = { userId: req.user._id };
    if (status) filter.status = status;
    if (type) filter.type = type;

    const messages = await ScheduledMessage
      .find(filter)
      .populate('leadId', 'name phone email')
      .populate('taskId', 'title')
      .sort({ scheduledTime: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await ScheduledMessage.countDocuments(filter);

    res.json({
      success: true,
      data: {
        messages,
        pagination: {
          total,
          limit: parseInt(limit),
          skip: parseInt(skip),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get upcoming scheduled messages (next 7 days)
// @route   GET /api/scheduled-messages/upcoming
// @access  Private
const getUpcomingMessages = async (req, res, next) => {
  try {
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const messages = await ScheduledMessage
      .find({
        userId: req.user._id,
        status: 'pending',
        scheduledTime: {
          $gte: now,
          $lte: sevenDaysLater
        }
      })
      .populate('leadId', 'name phone email')
      .populate('taskId', 'title')
      .sort({ scheduledTime: 1 });

    res.json({
      success: true,
      data: {
        messages,
        count: messages.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get statistics of scheduled messages
// @route   GET /api/scheduled-messages/stats
// @access  Private
const getMessageStats = async (req, res, next) => {
  try {
    const now = new Date();

    const stats = {
      pending: await ScheduledMessage.countDocuments({
        userId: req.user._id,
        status: 'pending'
      }),
      sent: await ScheduledMessage.countDocuments({
        userId: req.user._id,
        status: 'sent'
      }),
      failed: await ScheduledMessage.countDocuments({
        userId: req.user._id,
        status: 'failed'
      }),
      upcomingToday: await ScheduledMessage.countDocuments({
        userId: req.user._id,
        status: 'pending',
        scheduledTime: {
          $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
        }
      }),
      byType: {}
    };

    // Count by type
    const typeStats = await ScheduledMessage.aggregate([
      {
        $match: {
          userId: req.user._id,
          status: 'pending'
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    typeStats.forEach(ts => {
      stats.byType[ts._id] = ts.count;
    });

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a scheduled message
// @route   POST /api/scheduled-messages
// @access  Private
const createScheduledMessage = async (req, res, next) => {
  try {
    const {
      leadId,
      taskId,
      type,
      content,
      scheduledTime,
      recipientName,
      recipientPhone,
      recipientEmail,
      template,
      variables
    } = req.body;

    if (!leadId || !type || !content || !scheduledTime) {
      throw new AppError('Missing required fields', 400, 'VALIDATION_ERROR');
    }

    const message = await ScheduledMessage.create({
      userId: req.user._id,
      leadId,
      taskId,
      type,
      content,
      scheduledTime: new Date(scheduledTime),
      recipientName,
      recipientPhone,
      recipientEmail,
      template,
      variables
    });

    await message.populate('leadId', 'name phone email');

    res.status(201).json({
      success: true,
      data: { message }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update scheduled message
// @route   PUT /api/scheduled-messages/:id
// @access  Private
const updateScheduledMessage = async (req, res, next) => {
  try {
    const message = await ScheduledMessage.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!message) {
      throw new AppError('Scheduled message not found', 404, 'NOT_FOUND');
    }

    if (message.status !== 'pending') {
      throw new AppError('Cannot update non-pending messages', 400, 'INVALID_STATUS');
    }

    const { content, scheduledTime, recipientPhone, recipientEmail } = req.body;

    if (content) message.content = content;
    if (scheduledTime) message.scheduledTime = new Date(scheduledTime);
    if (recipientPhone) message.recipientPhone = recipientPhone;
    if (recipientEmail) message.recipientEmail = recipientEmail;

    await message.save();
    await message.populate('leadId', 'name phone email');

    res.json({
      success: true,
      data: { message }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel scheduled message
// @route   DELETE /api/scheduled-messages/:id
// @access  Private
const cancelScheduledMessage = async (req, res, next) => {
  try {
    const message = await ScheduledMessage.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!message) {
      throw new AppError('Scheduled message not found', 404, 'NOT_FOUND');
    }

    if (message.status !== 'pending') {
      throw new AppError('Can only cancel pending messages', 400, 'INVALID_STATUS');
    }

    message.status = 'cancelled';
    await message.save();

    res.json({
      success: true,
      data: {
        message: 'Message cancelled successfully'
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getScheduledMessages,
  getUpcomingMessages,
  getMessageStats,
  createScheduledMessage,
  updateScheduledMessage,
  cancelScheduledMessage
};
