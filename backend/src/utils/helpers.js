/**
 * Utility helper functions
 */

/**
 * Generate random string
 * @param {number} length - Length of string
 * @returns {string} - Random string
 */
const generateRandomString = (length = 32) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Format date to IST
 * @param {Date} date - Date to format
 * @returns {string} - Formatted date string
 */
const formatDateIST = (date) => {
  return new Date(date).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short'
  });
};

/**
 * Calculate days between two dates
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @returns {number} - Number of days
 */
const daysBetween = (date1, date2) => {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((new Date(date1) - new Date(date2)) / oneDay));
};

/**
 * Sanitize string for search
 * @param {string} str - String to sanitize
 * @returns {string} - Sanitized string
 */
const sanitizeSearch = (str) => {
  if (!str) return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Parse pagination params
 * @param {Object} query - Query params
 * @returns {Object} - Parsed pagination
 */
const parsePagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Build pagination response
 * @param {number} total - Total count
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {Object} - Pagination metadata
 */
const buildPaginationResponse = (total, page, limit) => {
  return {
    total,
    page,
    pages: Math.ceil(total / limit),
    limit,
    hasMore: page * limit < total
  };
};

/**
 * Format currency (INR)
 * @param {number} amount - Amount
 * @returns {string} - Formatted amount
 */
const formatCurrency = (amount) => {
  if (!amount || isNaN(amount)) return '₹0';

  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  } else if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} Lac`;
  } else {
    return `₹${amount.toLocaleString('en-IN')}`;
  }
};

/**
 * Slugify string
 * @param {string} str - String to slugify
 * @returns {string} - Slugified string
 */
const slugify = (str) => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Sleep utility
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} - Promise that resolves after delay
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Pick specific fields from object
 * @param {Object} obj - Source object
 * @param {Array} fields - Fields to pick
 * @returns {Object} - Object with only specified fields
 */
const pick = (obj, fields) => {
  return fields.reduce((result, field) => {
    if (obj.hasOwnProperty(field)) {
      result[field] = obj[field];
    }
    return result;
  }, {});
};

/**
 * Omit specific fields from object
 * @param {Object} obj - Source object
 * @param {Array} fields - Fields to omit
 * @returns {Object} - Object without specified fields
 */
const omit = (obj, fields) => {
  return Object.keys(obj).reduce((result, key) => {
    if (!fields.includes(key)) {
      result[key] = obj[key];
    }
    return result;
  }, {});
};

module.exports = {
  generateRandomString,
  formatDateIST,
  daysBetween,
  sanitizeSearch,
  parsePagination,
  buildPaginationResponse,
  formatCurrency,
  slugify,
  sleep,
  pick,
  omit
};
