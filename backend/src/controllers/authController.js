// @desc    Accept invite and activate user
// @route   POST /api/auth/accept-invite
// @access  Public
const acceptInvite = async (req, res, next) => {
  try {
    const { token, name, password } = req.body;
    if (!token || !name || !password) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Token, name, and password are required',
          code: 'VALIDATION_ERROR'
        }
      });
    }

    // Find user by invite token
    const user = await User.findOne({ emailVerificationToken: token, isActive: false });
    if (!user) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid or expired invite token',
          code: 'INVALID_TOKEN'
        }
      });
    }

    // Update user details
    user.name = name;
    user.password = password;
    user.isActive = true;
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    // Generate token
    const jwtToken = user.generateAuthToken();

    // Send welcome email (async)
    emailService.sendWelcomeEmail(user).catch(err => {
      console.error('Failed to send welcome email:', err.message);
    });

    res.status(200).json({
      success: true,
      data: {
        token: jwtToken,
        user: user.toJSON()
      }
    });
  } catch (error) {
    next(error);
  }
};
const User = require('../models/User');
const Notification = require('../models/Notification');
const emailService = require('../services/emailService');
const { AppError } = require('../middleware/errorHandler');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, company, industry } = req.body;

    // Normalize and validate industry to match enum in User model
    const allowedIndustries = [
      'real_estate',
      'insurance',
      'financial_services',
      'education',
      'healthcare',
      'retail',
      'technology',
      'other'
    ];
    const normalizedIndustry = industry
      ? industry.toString().trim().toLowerCase().replace(/\s+/g, '_')
      : undefined;
    if (normalizedIndustry && !allowedIndustries.includes(normalizedIndustry)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid industry',
          code: 'VALIDATION_ERROR',
          details: [{ field: 'industry', message: 'Invalid industry' }]
        }
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Email already registered',
          code: 'EMAIL_EXISTS'
        }
      });
    }

    // Check if phone already exists
    if (phone) {
      const phoneExists = await User.findOne({ phone });
      if (phoneExists) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Phone number already registered',
            code: 'PHONE_EXISTS'
          }
        });
      }
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      phone,
      company,
      industry: normalizedIndustry,
      lastLogin: new Date()
    });

    // Generate token
    const token = user.generateAuthToken();

    // Send welcome email (async, don't wait)
    emailService.sendWelcomeEmail(user).catch(err => {
      console.error('Failed to send welcome email:', err.message);
    });

    // Create welcome notification
    await Notification.notify({
      userId: user._id,
      type: 'welcome',
      title: 'Welcome to FollowUpX!',
      message: 'Get started by adding your first lead and scheduling a follow-up task.',
      actionUrl: '/leads/new'
    });

    res.status(201).json({
      success: true,
      data: {
        token,
        user: user.toJSON()
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Get user with password
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS'
        }
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Your account has been deactivated. Please contact support.',
          code: 'ACCOUNT_DEACTIVATED'
        }
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS'
        }
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Generate token
    const token = user.generateAuthToken();

    res.json({
      success: true,
      data: {
        token,
        user: user.toJSON()
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    // User is already attached to req by auth middleware
    const user = await User.findById(req.user._id);

    res.json({
      success: true,
      data: {
        user: user.toJSON()
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, company, industry, settings, profileImage } = req.body;

    const allowedIndustries = [
      'real_estate',
      'insurance',
      'financial_services',
      'education',
      'healthcare',
      'retail',
      'technology',
      'other'
    ];
    const normalizedIndustry = industry
      ? industry.toString().trim().toLowerCase().replace(/\s+/g, '_')
      : undefined;
    if (normalizedIndustry && !allowedIndustries.includes(normalizedIndustry)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid industry',
          code: 'VALIDATION_ERROR',
          details: [{ field: 'industry', message: 'Invalid industry' }]
        }
      });
    }

    const updateFields = {};
    if (name) updateFields.name = name;
    if (phone) updateFields.phone = phone;
    if (company) updateFields.company = company;
    if (profileImage) updateFields.profileImage = profileImage;
    if (normalizedIndustry) updateFields.industry = normalizedIndustry;
    if (settings) updateFields.settings = { ...req.user.settings, ...settings };

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateFields,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: {
        user: user.toJSON()
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   PUT /api/auth/password
// @access  Private
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Current password is incorrect',
          code: 'INVALID_PASSWORD'
        }
      });
    }

    // Validate new password
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'New password must be at least 8 characters',
          code: 'WEAK_PASSWORD'
        }
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Generate new token
    const token = user.generateAuthToken();

    res.json({
      success: true,
      message: 'Password changed successfully',
      data: {
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update notification settings
// @route   PATCH /api/auth/settings/notifications
// @access  Private
const updateNotificationSettings = async (req, res, next) => {
  try {
    const { emailReminders, dailySummary, weeklyReport, inAppNotifications } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        'settings.notifications': {
          emailReminders: emailReminders !== undefined ? emailReminders : req.user.settings.notifications.emailReminders,
          dailySummary: dailySummary !== undefined ? dailySummary : req.user.settings.notifications.dailySummary,
          weeklyReport: weeklyReport !== undefined ? weeklyReport : req.user.settings.notifications.weeklyReport,
          inAppNotifications: inAppNotifications !== undefined ? inAppNotifications : req.user.settings.notifications.inAppNotifications
        }
      },
      { new: true }
    );

    res.json({
      success: true,
      data: {
        settings: user.settings
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout (client-side, just for logging)
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res, next) => {
  try {
    // In a stateless JWT setup, logout is handled client-side
    // This endpoint is for any server-side cleanup if needed

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  updateNotificationSettings,
  logout,
  acceptInvite
};
