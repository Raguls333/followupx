const rateLimit = require('express-rate-limit');

// General API rate limiter
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '15') * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'), // 100 requests per window
  message: {
    success: false,
    error: {
      message: 'Too many requests, please try again later',
      code: 'RATE_LIMIT_EXCEEDED'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for health check
  skip: (req) => req.path === '/api/health'
});

// Strict rate limiter for auth endpoints (prevent brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: {
    success: false,
    error: {
      message: 'Too many authentication attempts, please try again later',
      code: 'AUTH_RATE_LIMIT_EXCEEDED'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // Don't count successful logins
});

// CSV import rate limiter (heavy operation)
const importLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 imports per hour
  message: {
    success: false,
    error: {
      message: 'Too many import operations, please try again later',
      code: 'IMPORT_RATE_LIMIT_EXCEEDED'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Export rate limiter
const exportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 exports per hour
  message: {
    success: false,
    error: {
      message: 'Too many export operations, please try again later',
      code: 'EXPORT_RATE_LIMIT_EXCEEDED'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

// WhatsApp link generation limiter
const whatsappLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 links per minute
  message: {
    success: false,
    error: {
      message: 'Too many WhatsApp link requests, please slow down',
      code: 'WHATSAPP_RATE_LIMIT_EXCEEDED'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  generalLimiter,
  authLimiter,
  importLimiter,
  exportLimiter,
  whatsappLimiter
};
