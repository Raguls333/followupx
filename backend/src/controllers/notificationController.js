const Notification = require('../models/Notification');

// @desc    Get all notifications
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res, next) => {
  try {
    const { read, page = 1, limit = 20 } = req.query;

    const query = { userId: req.user._id };

    if (read === 'true') {
      query.read = true;
    } else if (read === 'false') {
      query.read = false;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .populate('leadId', 'name')
        .populate('taskId', 'title type')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Notification.countDocuments(query),
      Notification.getUnreadCount(req.user._id)
    ]);

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
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

// @desc    Get unread notifications
// @route   GET /api/notifications/unread
// @access  Private
const getUnread = async (req, res, next) => {
  try {
    const { limit = 50 } = req.query;

    const [notifications, count] = await Promise.all([
      Notification.getUnread(req.user._id, parseInt(limit)),
      Notification.getUnreadCount(req.user._id)
    ]);

    res.json({
      success: true,
      data: {
        notifications,
        count
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Notification not found',
          code: 'NOT_FOUND'
        }
      });
    }

    await notification.markRead();

    res.json({
      success: true,
      data: {
        notification
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all notifications as read
// @route   PATCH /api/notifications/mark-all-read
// @access  Private
const markAllRead = async (req, res, next) => {
  try {
    const modified = await Notification.markAllRead(req.user._id);

    res.json({
      success: true,
      message: `${modified} notifications marked as read`,
      data: {
        modified
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Notification not found',
          code: 'NOT_FOUND'
        }
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Clear all notifications
// @route   DELETE /api/notifications/clear-all
// @access  Private
const clearAll = async (req, res, next) => {
  try {
    const result = await Notification.deleteMany({ userId: req.user._id });

    res.json({
      success: true,
      message: `${result.deletedCount} notifications cleared`,
      data: {
        deleted: result.deletedCount
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get notification count
// @route   GET /api/notifications/count
// @access  Private
const getCount = async (req, res, next) => {
  try {
    const [total, unread] = await Promise.all([
      Notification.countDocuments({ userId: req.user._id }),
      Notification.getUnreadCount(req.user._id)
    ]);

    res.json({
      success: true,
      data: {
        total,
        unread
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  getUnread,
  markAsRead,
  markAllRead,
  deleteNotification,
  clearAll,
  getCount
};
