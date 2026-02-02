const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
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
  // For team assignments
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Core fields
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  type: {
    type: String,
    enum: ['call', 'whatsapp', 'email', 'meeting', 'site_visit', 'follow_up', 'other'],
    default: 'follow_up'
  },
  description: {
    type: String,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  // Scheduling
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  dueTime: {
    type: String // Store as HH:MM format for display
  },
  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'pending'
  },
  completedAt: {
    type: Date
  },
  // Reminders
  reminderAt: {
    type: Date
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  overdueNotified: {
    type: Boolean,
    default: false
  },
  // Agenda job reference
  agendaJobId: {
    type: mongoose.Schema.Types.ObjectId
  },
  // Outcomes
  outcome: {
    type: String,
    enum: ['successful', 'no_answer', 'callback_requested', 'not_interested', 'rescheduled', 'other']
  },
  outcomeNotes: {
    type: String,
    maxlength: [1000, 'Outcome notes cannot exceed 1000 characters']
  },
  // Recurring tasks
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurrence: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly']
    },
    interval: {
      type: Number,
      min: 1,
      max: 30
    },
    endDate: Date,
    lastCreated: Date
  },
  // Parent task for recurring
  parentTaskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }
}, {
  timestamps: true
});

// Indexes
taskSchema.index({ userId: 1, status: 1, dueDate: 1 });
taskSchema.index({ userId: 1, assignedTo: 1, status: 1, dueDate: 1 });
taskSchema.index({ leadId: 1, status: 1, dueDate: -1 });
taskSchema.index({ reminderSent: 1, reminderAt: 1 }, { sparse: true });
taskSchema.index({ status: 1, dueDate: 1, overdueNotified: 1 });

// Virtual for checking if overdue
taskSchema.virtual('isOverdue').get(function() {
  if (this.status !== 'pending') return false;
  return new Date() > this.dueDate;
});

// Ensure virtuals are included
taskSchema.set('toJSON', { virtuals: true });
taskSchema.set('toObject', { virtuals: true });

// Pre-save to set completedAt when status changes to completed
taskSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  }
  next();
});

// Static method to get today's dashboard
taskSchema.statics.getTodaysDashboard = async function(userId, assignedTo = null) {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const baseQuery = { userId, status: 'pending' };
  if (assignedTo) {
    baseQuery.assignedTo = assignedTo;
  }

  const [overdue, today, upcoming] = await Promise.all([
    // Overdue tasks
    this.find({
      ...baseQuery,
      dueDate: { $lt: todayStart }
    })
      .populate('leadId', 'name phone company status')
      .sort({ dueDate: 1 })
      .lean(),

    // Today's tasks
    this.find({
      ...baseQuery,
      dueDate: { $gte: todayStart, $lte: todayEnd }
    })
      .populate('leadId', 'name phone company status')
      .sort({ dueDate: 1 })
      .lean(),

    // Upcoming tasks (next 7 days)
    this.find({
      ...baseQuery,
      dueDate: { $gt: todayEnd, $lte: weekEnd }
    })
      .populate('leadId', 'name phone company status')
      .sort({ dueDate: 1 })
      .limit(20)
      .lean()
  ]);

  return { overdue, today, upcoming };
};

module.exports = mongoose.model('Task', taskSchema);
