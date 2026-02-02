const { body, param, query, validationResult } = require('express-validator');
const { parsePhoneNumber, isValidPhoneNumber } = require('libphonenumber-js');

// Handle validation results
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors.array().map(err => ({
          field: err.path,
          message: err.msg
        }))
      }
    });
  }
  next();
};

// Phone number formatter
const formatIndianPhone = (phone) => {
  if (!phone) return null;

  // Remove all non-digits
  let cleaned = phone.replace(/\D/g, '');

  // Remove leading zeros
  cleaned = cleaned.replace(/^0+/, '');

  // If it's 10 digits starting with 6-9, add 91 prefix
  if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) {
    cleaned = '91' + cleaned;
  }

  // If it's 12 digits starting with 91, format properly
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return '+' + cleaned;
  }

  return null;
};

// Custom phone validator
const validatePhone = (value) => {
  const formatted = formatIndianPhone(value);
  if (!formatted) {
    throw new Error('Please provide a valid Indian phone number');
  }
  return formatted;
};

// Auth validation rules
const validateRegister = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('phone')
    .optional()
    .customSanitizer(formatIndianPhone)
    .custom((value) => {
      if (value && !value.match(/^\+91[6-9]\d{9}$/)) {
        throw new Error('Please provide a valid Indian phone number');
      }
      return true;
    }),
  body('company')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Company name cannot exceed 100 characters'),
  body('industry')
    .optional()
    .isIn(['real_estate', 'insurance', 'financial_services', 'education', 'healthcare', 'retail', 'technology', 'other'])
    .withMessage('Invalid industry'),
  handleValidation
];

const validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required'),
  handleValidation
];

// Lead validation rules
const validateCreateLead = [
  body('name.first')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isLength({ max: 50 }).withMessage('First name cannot exceed 50 characters'),
  body('name.last')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Last name cannot exceed 50 characters'),
  body('phone')
    .notEmpty().withMessage('Phone number is required')
    .customSanitizer(formatIndianPhone)
    .custom((value) => {
      if (!value || !value.match(/^\+91[6-9]\d{9}$/)) {
        throw new Error('Please provide a valid Indian phone number');
      }
      return true;
    }),
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('company')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Company name cannot exceed 100 characters'),
  body('status')
    .optional()
    .isIn(['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'])
    .withMessage('Invalid status'),
  body('source')
    .optional()
    .isIn(['website', 'referral', 'cold_call', 'social_media', 'advertisement', 'walk_in', 'trade_show', 'other'])
    .withMessage('Invalid source'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority'),
  body('estimatedValue')
    .optional()
    .isNumeric().withMessage('Estimated value must be a number')
    .isFloat({ min: 0 }).withMessage('Estimated value must be positive'),
  body('tags')
    .optional()
    .isArray().withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .isString().withMessage('Each tag must be a string')
    .isLength({ max: 30 }).withMessage('Tag cannot exceed 30 characters'),
  handleValidation
];

const validateUpdateLead = [
  param('id')
    .isMongoId().withMessage('Invalid lead ID'),
  body('name.first')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('First name cannot exceed 50 characters'),
  body('name.last')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Last name cannot exceed 50 characters'),
  body('phone')
    .optional()
    .customSanitizer(formatIndianPhone)
    .custom((value) => {
      if (value && !value.match(/^\+91[6-9]\d{9}$/)) {
        throw new Error('Please provide a valid Indian phone number');
      }
      return true;
    }),
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  handleValidation
];

// Task validation rules
const validateCreateTask = [
  body('title')
    .trim()
    .notEmpty().withMessage('Task title is required')
    .isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),
  body('type')
    .optional()
    .isIn(['call', 'whatsapp', 'email', 'meeting', 'site_visit', 'follow_up', 'other'])
    .withMessage('Invalid task type'),
  body('leadId')
    .notEmpty().withMessage('Lead ID is required')
    .isMongoId().withMessage('Invalid lead ID'),
  body('dueDate')
    .notEmpty().withMessage('Due date is required')
    .isISO8601().withMessage('Invalid date format')
    .custom((value) => {
      if (new Date(value) < new Date()) {
        throw new Error('Due date must be in the future');
      }
      return true;
    }),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority'),
  body('reminderAt')
    .optional()
    .isISO8601().withMessage('Invalid reminder date format')
    .custom((value, { req }) => {
      if (value && new Date(value) < new Date()) {
        throw new Error('Reminder must be in the future');
      }
      return true;
    }),
  body('description')
    .optional()
    .isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),
  handleValidation
];

const validateUpdateTask = [
  param('id')
    .isMongoId().withMessage('Invalid task ID'),
  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),
  body('dueDate')
    .optional()
    .isISO8601().withMessage('Invalid date format'),
  handleValidation
];

const validateCompleteTask = [
  param('id')
    .isMongoId().withMessage('Invalid task ID'),
  body('outcome')
    .optional()
    .isIn(['successful', 'no_answer', 'callback_requested', 'not_interested', 'rescheduled', 'other'])
    .withMessage('Invalid outcome'),
  body('outcomeNotes')
    .optional()
    .isLength({ max: 1000 }).withMessage('Outcome notes cannot exceed 1000 characters'),
  handleValidation
];

// Template validation rules
const validateCreateTemplate = [
  body('name')
    .trim()
    .notEmpty().withMessage('Template name is required')
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
  body('category')
    .optional()
    .isIn(['initial_contact', 'follow_up', 'appointment', 'closing', 're_engagement', 'thank_you', 'custom'])
    .withMessage('Invalid category'),
  body('message')
    .notEmpty().withMessage('Message is required')
    .isLength({ max: 2000 }).withMessage('Message cannot exceed 2000 characters'),
  body('language')
    .optional()
    .isIn(['en', 'hi', 'hinglish'])
    .withMessage('Invalid language'),
  handleValidation
];

// Activity validation rules
const validateCreateActivity = [
  body('leadId')
    .notEmpty().withMessage('Lead ID is required')
    .isMongoId().withMessage('Invalid lead ID'),
  body('type')
    .notEmpty().withMessage('Activity type is required')
    .isIn([
      'lead_created', 'lead_updated', 'lead_assigned', 'status_changed',
      'task_created', 'task_completed', 'task_cancelled', 'task_rescheduled',
      'whatsapp_sent', 'call_made', 'call_received', 'email_sent', 'email_received',
      'meeting_scheduled', 'meeting_completed', 'site_visit', 'note_added',
      'document_shared', 'proposal_sent', 'deal_won', 'deal_lost',
      'follow_up_scheduled', 'custom'
    ])
    .withMessage('Invalid activity type'),
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),
  handleValidation
];

// Pagination validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  handleValidation
];

// MongoDB ID validation
const validateMongoId = [
  param('id')
    .isMongoId().withMessage('Invalid ID'),
  handleValidation
];

module.exports = {
  handleValidation,
  formatIndianPhone,
  validateRegister,
  validateLogin,
  validateCreateLead,
  validateUpdateLead,
  validateCreateTask,
  validateUpdateTask,
  validateCompleteTask,
  validateCreateTemplate,
  validateCreateActivity,
  validatePagination,
  validateMongoId
};
