const mongoose = require('mongoose');

const scheduledMessageSchema = new mongoose.Schema({
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
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  },
  // Message details
  type: {
    type: String,
    enum: ['whatsapp', 'email', 'sms', 'call'],
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  // Scheduling
  scheduledTime: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'cancelled'],
    default: 'pending'
  },
  // Contact info
  recipientName: {
    type: String
  },
  recipientPhone: {
    type: String
  },
  recipientEmail: {
    type: String
  },
  // Execution details
  sentAt: {
    type: Date
  },
  failureReason: {
    type: String
  },
  retryCount: {
    type: Number,
    default: 0
  },
  // Metadata
  template: {
    type: String
  },
  variables: {
    type: mongoose.Schema.Types.Mixed
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
scheduledMessageSchema.index({ userId: 1, scheduledTime: 1 });
scheduledMessageSchema.index({ userId: 1, status: 1 });
scheduledMessageSchema.index({ scheduledTime: 1, status: 1 });
scheduledMessageSchema.index({ leadId: 1 });

module.exports = mongoose.model('ScheduledMessage', scheduledMessageSchema);
