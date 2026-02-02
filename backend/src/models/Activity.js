const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true
  },
  // Activity type
  type: {
    type: String,
    enum: [
      'lead_created',
      'lead_updated',
      'lead_assigned',
      'status_changed',
      'task_created',
      'task_completed',
      'task_cancelled',
      'task_rescheduled',
      'whatsapp_sent',
      'call_made',
      'call_received',
      'email_sent',
      'email_received',
      'meeting_scheduled',
      'meeting_completed',
      'site_visit',
      'note_added',
      'document_shared',
      'proposal_sent',
      'deal_won',
      'deal_lost',
      'follow_up_scheduled',
      'custom'
    ],
    required: true
  },
  // Content
  title: {
    type: String,
    required: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  // Flexible metadata for type-specific data
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // References
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  },
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Template'
  },
  // Custom timestamp (for logging past activities)
  timestamp: {
    type: Date,
    default: Date.now
  },
  // Who performed the activity (for team scenarios)
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
activitySchema.index({ userId: 1, leadId: 1, timestamp: -1 });
activitySchema.index({ userId: 1, type: 1, timestamp: -1 });
activitySchema.index({ leadId: 1, timestamp: -1 });
activitySchema.index({ userId: 1, timestamp: -1 });

// Static method to log activity
activitySchema.statics.log = async function(data) {
  const {
    userId,
    leadId,
    type,
    title,
    description,
    metadata,
    taskId,
    templateId,
    performedBy,
    timestamp
  } = data;

  return this.create({
    userId,
    leadId,
    type,
    title,
    description,
    metadata: metadata || {},
    taskId,
    templateId,
    performedBy: performedBy || userId,
    timestamp: timestamp || new Date()
  });
};

// Static method to get lead timeline
activitySchema.statics.getLeadTimeline = async function(leadId, options = {}) {
  const { limit = 50, page = 1, type } = options;
  const skip = (page - 1) * limit;

  const query = { leadId };
  if (type) {
    query.type = type;
  }

  const [activities, total] = await Promise.all([
    this.find(query)
      .populate('performedBy', 'name email')
      .populate('taskId', 'title type')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(query)
  ]);

  return {
    activities,
    total,
    page,
    pages: Math.ceil(total / limit)
  };
};

// Helper to get icon and color based on activity type
activitySchema.statics.getActivityMeta = function(type) {
  const meta = {
    lead_created: { icon: 'user-plus', color: 'green' },
    lead_updated: { icon: 'edit', color: 'blue' },
    lead_assigned: { icon: 'user-check', color: 'purple' },
    status_changed: { icon: 'git-branch', color: 'orange' },
    task_created: { icon: 'plus-circle', color: 'blue' },
    task_completed: { icon: 'check-circle', color: 'green' },
    task_cancelled: { icon: 'x-circle', color: 'red' },
    task_rescheduled: { icon: 'calendar', color: 'yellow' },
    whatsapp_sent: { icon: 'message-circle', color: 'green' },
    call_made: { icon: 'phone-outgoing', color: 'blue' },
    call_received: { icon: 'phone-incoming', color: 'teal' },
    email_sent: { icon: 'mail', color: 'blue' },
    email_received: { icon: 'inbox', color: 'teal' },
    meeting_scheduled: { icon: 'calendar-plus', color: 'purple' },
    meeting_completed: { icon: 'calendar-check', color: 'green' },
    site_visit: { icon: 'map-pin', color: 'orange' },
    note_added: { icon: 'file-text', color: 'gray' },
    document_shared: { icon: 'file', color: 'blue' },
    proposal_sent: { icon: 'file-text', color: 'purple' },
    deal_won: { icon: 'trophy', color: 'gold' },
    deal_lost: { icon: 'x-octagon', color: 'red' },
    follow_up_scheduled: { icon: 'clock', color: 'blue' },
    custom: { icon: 'activity', color: 'gray' }
  };

  return meta[type] || meta.custom;
};

module.exports = mongoose.model('Activity', activitySchema);
