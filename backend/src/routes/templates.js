const express = require('express');
const router = express.Router();
const {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  renderTemplate,
  useTemplate
} = require('../controllers/templateController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Template routes
router.get('/', getTemplates);
router.post('/', createTemplate);
router.post('/render', renderTemplate);
router.get('/:id', getTemplate);
router.put('/:id', updateTemplate);
router.delete('/:id', deleteTemplate);
router.patch('/:id/use', useTemplate);

module.exports = router;
