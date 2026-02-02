const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  getLeads,
  getLead,
  createLead,
  updateLead,
  updateLeadStatus,
  deleteLead,
  importLeads,
  checkDuplicate,
  getAIRecoveryLeads,
  getLeadStats
} = require('../controllers/leadController');
const { authenticate } = require('../middleware/auth');
const { validateCreateLead, validateUpdateLead, validateMongoId } = require('../middleware/validation');
const { importLimiter } = require('../middleware/rateLimiter');

// Configure multer for CSV upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

// All routes require authentication
router.use(authenticate);

// Lead routes
router.get('/', getLeads);
router.get('/stats', getLeadStats);
router.get('/ai-recovery', getAIRecoveryLeads);
router.post('/', validateCreateLead, createLead);
router.post('/check-duplicate', checkDuplicate);
router.post('/import', importLimiter, upload.single('file'), importLeads);

// Individual lead routes
router.get('/:id', validateMongoId, getLead);
router.put('/:id', validateUpdateLead, updateLead);
router.patch('/:id/status', validateMongoId, updateLeadStatus);
router.delete('/:id', validateMongoId, deleteLead);

module.exports = router;
