const { authenticate, checkPlan, checkRole, checkOwnership } = require('./auth');
const errorHandler = require('./errorHandler');
const { AppError, asyncHandler, notFound } = require('./errorHandler');
const validation = require('./validation');
const rateLimiter = require('./rateLimiter');

module.exports = {
  authenticate,
  checkPlan,
  checkRole,
  checkOwnership,
  errorHandler,
  AppError,
  asyncHandler,
  notFound,
  ...validation,
  ...rateLimiter
};
