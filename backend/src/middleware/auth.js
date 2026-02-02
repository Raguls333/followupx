const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - require authentication
const authenticate = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Not authorized to access this route',
          code: 'NO_TOKEN'
        }
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from database
      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'User not found',
            code: 'USER_NOT_FOUND'
          }
        });
      }

      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'User account is deactivated',
            code: 'ACCOUNT_DEACTIVATED'
          }
        });
      }

      // Attach user to request
      req.user = user;
      next();
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Token is invalid or expired',
          code: 'INVALID_TOKEN'
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

// Check for specific plan
const checkPlan = (...allowedPlans) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Not authorized',
          code: 'NOT_AUTHORIZED'
        }
      });
    }

    if (!allowedPlans.includes(req.user.plan)) {
      return res.status(403).json({
        success: false,
        error: {
          message: `This feature requires ${allowedPlans.join(' or ')} plan`,
          code: 'PLAN_REQUIRED',
          requiredPlans: allowedPlans,
          currentPlan: req.user.plan
        }
      });
    }

    // Check if plan has expired (for paid plans)
    if (req.user.plan !== 'free' && req.user.planExpiry && new Date() > req.user.planExpiry) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Your plan has expired. Please renew to access this feature.',
          code: 'PLAN_EXPIRED'
        }
      });
    }

    next();
  };
};

// Check for specific role (for team features)
const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Not authorized',
          code: 'NOT_AUTHORIZED'
        }
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'You do not have permission to perform this action',
          code: 'ROLE_REQUIRED',
          requiredRoles: allowedRoles,
          currentRole: req.user.role
        }
      });
    }

    next();
  };
};

// Check if user owns the resource or is team owner/manager
const checkOwnership = (Model, resourceField = 'userId') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id;
      const resource = await Model.findById(resourceId);

      if (!resource) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Resource not found',
            code: 'NOT_FOUND'
          }
        });
      }

      const resourceUserId = resource[resourceField].toString();
      const currentUserId = req.user._id.toString();

      // Check if user owns the resource
      if (resourceUserId === currentUserId) {
        req.resource = resource;
        return next();
      }

      // Check if user is team owner/manager and resource belongs to team member
      if (req.user.role === 'owner' || req.user.role === 'manager') {
        const resourceOwner = await User.findById(resource[resourceField]);
        if (resourceOwner && resourceOwner.teamId?.toString() === currentUserId) {
          req.resource = resource;
          return next();
        }
      }

      return res.status(403).json({
        success: false,
        error: {
          message: 'Not authorized to access this resource',
          code: 'NOT_AUTHORIZED'
        }
      });
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  authenticate,
  checkPlan,
  checkRole,
  checkOwnership
};
