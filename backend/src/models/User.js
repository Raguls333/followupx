const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  phone: {
    type: String,
    trim: true,
    match: [/^\+91[6-9]\d{9}$/, 'Please provide a valid Indian phone number (+91XXXXXXXXXX)']
  },
  company: {
    type: String,
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  profileImage: {
    type: String,
    trim: true,
    default: null
  },
  industry: {
    type: String,
    trim: true,
    enum: ['real_estate', 'insurance', 'financial_services', 'education', 'healthcare', 'retail', 'technology', 'other']
  },
  // Subscription info
  plan: {
    type: String,
    enum: ['free', 'pro', 'team', 'enterprise'],
    default: 'free'
  },
  planExpiry: {
    type: Date
  },
  // Team collaboration
  role: {
    type: String,
    enum: ['owner', 'manager', 'rep'],
    default: 'owner'
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // Settings
  settings: {
    timezone: {
      type: String,
      default: 'Asia/Kolkata'
    },
    currency: {
      type: String,
      enum: ['INR', 'USD', 'AED', 'EUR', 'GBP'],
      default: 'INR'
    },
    whatsappCountryCode: {
      type: String,
      default: '+91'
    },
    notifications: {
      emailReminders: { type: Boolean, default: true },
      dailySummary: { type: Boolean, default: true },
      weeklyReport: { type: Boolean, default: true },
      inAppNotifications: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
      dailyDigest: { type: Boolean, default: true },
      whatsapp: { type: Boolean, default: true }
    },
    defaultFollowUpDays: {
      type: Number,
      default: 3
    }
  },
  // Metadata
  lastLogin: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date
}, {
  timestamps: true
});

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ teamId: 1, role: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT token
userSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    { id: this._id, email: this.email, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '24h' }
  );
};

// Return user data without sensitive fields
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.emailVerificationToken;
  delete user.passwordResetToken;
  delete user.passwordResetExpires;
  return user;
};

module.exports = mongoose.model('User', userSchema);
