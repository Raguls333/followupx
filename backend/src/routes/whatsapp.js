const express = require('express');
const router = express.Router();
const {
  generateLink,
  logSend,
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  previewTemplate,
  getCategories
} = require('../controllers/whatsappController');
const { authenticate } = require('../middleware/auth');
const { validateCreateTemplate, validateMongoId } = require('../middleware/validation');
const { whatsappLimiter } = require('../middleware/rateLimiter');

// All routes require authentication
router.use(authenticate);

// WhatsApp link routes
router.post('/generate-link', whatsappLimiter, generateLink);
router.post('/log-send', logSend);

// Template routes
router.get('/templates', getTemplates);
router.get('/templates/categories', getCategories);
router.post('/templates', validateCreateTemplate, createTemplate);
router.post('/templates/:id/preview', validateMongoId, previewTemplate);
router.put('/templates/:id', validateMongoId, updateTemplate);
router.delete('/templates/:id', validateMongoId, deleteTemplate);

module.exports = router;
