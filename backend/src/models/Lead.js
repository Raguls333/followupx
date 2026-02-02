const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Contact info
  name: {
    first: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters']
    },
    last: {
      type: String,
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters']
    }
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^\+91[6-9]\d{9}$/, 'Please provide a valid Indian phone number (+91XXXXXXXXXX)']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  company: {
    type: String,
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  // Lead tracking
  status: {
    type: String,
    enum: ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'],
    default: 'new'
  },
  // Classification
  source: {
    type: String,
    enum: ['website', 'referral', 'cold_call', 'social_media', 'advertisement', 'walk_in', 'trade_show', 'other'],
    default: 'other'
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 30
  }],
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  estimatedValue: {
    type: Number,
    min: 0,
    default: 0
  },
  actualValue: {
    type: Number,
    min: 0
  },
  // Notes and timestamps
  notes: {
    type: String,
    maxlength: [5000, 'Notes cannot exceed 5000 characters']
  },
  lastContactedAt: {
    type: Date
  },
  nextFollowUpAt: {
    type: Date
  },
  wonAt: {
    type: Date
  },
  lostAt: {
    type: Date
  },
  lostReason: {
    type: String,
    enum: ['price', 'competitor', 'no_response', 'not_interested', 'timing', 'budget', 'other']
  },
  // Soft delete
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  // Additional fields for property (real estate specific)
  propertyInterest: {
    type: {
      type: String,
      enum: ['buy', 'sell', 'rent', 'invest']
    },
    budget: {
      min: Number,
      max: Number
    },
    location: String,
    propertyType: {
      type: String,
      enum: ['apartment', 'house', 'villa', 'plot', 'commercial', 'other']
    }
  }
}, {
  timestamps: true
});

// Indexes
leadSchema.index({ userId: 1, isDeleted: 1, status: 1, createdAt: -1 });
leadSchema.index({ userId: 1, isDeleted: 1, nextFollowUpAt: 1 });
leadSchema.index(
  { userId: 1, phone: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);
leadSchema.index(
  { 'name.first': 'text', 'name.last': 'text', company: 'text', email: 'text', notes: 'text' },
  { name: 'lead_text_search' }
);
leadSchema.index({ userId: 1, lastContactedAt: 1 });
leadSchema.index({ userId: 1, status: 1, updatedAt: 1 });

// Virtual for full name
leadSchema.virtual('fullName').get(function() {
  return `${this.name.first}${this.name.last ? ' ' + this.name.last : ''}`;
});

// Ensure virtuals are included in JSON
leadSchema.set('toJSON', { virtuals: true });
leadSchema.set('toObject', { virtuals: true });

// Pre-save middleware to update timestamps
leadSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    if (this.status === 'won') {
      this.wonAt = new Date();
    } else if (this.status === 'lost') {
      this.lostAt = new Date();
    }
  }
  next();
});

// Static method to find duplicates
leadSchema.statics.findDuplicate = async function(userId, phone) {
  return this.findOne({
    userId,
    phone,
    isDeleted: false
  });
};

module.exports = mongoose.model('Lead', leadSchema);
