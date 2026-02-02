const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Notification type
  type: {
    type: String,
    enum: [
      'task_reminder',
      'task_overdue',
      'task_assigned',
      'ai_recovery',
      'lead_assigned',
      'team_activity',
      'deal_won',
      'deal_lost',
      'system',
      'welcome',
      'plan_expiry'
    ],
    required: true
  },
  // Content
  title: {
    type: String,
    required: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  message: {
    type: String,
    required: true,
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  // Action
  actionUrl: {
    type: String
  },
  actionText: {
    type: String,
    maxlength: 50
  },
  // References
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead'
  },
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  },
  // Status
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  // Priority for sorting
  priority: {
    type: String,
    enum: ['low', 'normal', 'high'],
    default: 'normal'
  },
  // Additional data
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // Auto-delete after 30 days

// Static method to get unread notifications
notificationSchema.statics.getUnread = async function(userId, limit = 50) {
  return this.find({
    userId,
    read: false
  })
    .populate('leadId', 'name')
    .populate('taskId', 'title type')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({ userId, read: false });
};

// Static method to mark all as read
notificationSchema.statics.markAllRead = async function(userId) {
  const result = await this.updateMany(
    { userId, read: false },
    { read: true, readAt: new Date() }
  );
  return result.modifiedCount;
};

// Static method to create notification with smart defaults
notificationSchema.statics.notify = async function(data) {
  const {
    userId,
    type,
    title,
    message,
    actionUrl,
    leadId,
    taskId,
    priority = 'normal',
    metadata = {}
  } = data;

  // Set action text based on type
  let actionText = 'View';
  switch (type) {
    case 'task_reminder':
    case 'task_overdue':
    case 'task_assigned':
      actionText = 'View Task';
      break;
    case 'ai_recovery':
      actionText = 'Review Leads';
      break;
    case 'lead_assigned':
      actionText = 'View Lead';
      break;
    case 'deal_won':
    case 'deal_lost':
      actionText = 'View Details';
      break;
  }

  return this.create({
    userId,
    type,
    title,
    message,
    actionUrl,
    actionText,
    leadId,
    taskId,
    priority,
    metadata
  });
};

// Instance method to mark as read
notificationSchema.methods.markRead = async function() {
  if (!this.read) {
    this.read = true;
    this.readAt = new Date();
    await this.save();
  }
  return this;
};

// Helper to get icon based on notification type
notificationSchema.statics.getIcon = function(type) {
  const icons = {
    task_reminder: 'bell',
    task_overdue: 'alert-circle',
    task_assigned: 'user-plus',
    ai_recovery: 'cpu',
    lead_assigned: 'user-check',
    team_activity: 'users',
    deal_won: 'trophy',
    deal_lost: 'x-circle',
    system: 'info',
    welcome: 'smile',
    plan_expiry: 'clock'
  };
  return icons[type] || 'bell';
};

module.exports = mongoose.model('Notification', notificationSchema);
