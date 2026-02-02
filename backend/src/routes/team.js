const express = require('express');
const router = express.Router();
const {
  getMembers,
  inviteMember,
  removeMember,
  updateMemberRole,
  assignLead,
  getTeamActivity,
  getTeamStats
} = require('../controllers/teamController');
const { authenticate, checkPlan, checkRole } = require('../middleware/auth');
const { validateMongoId } = require('../middleware/validation');

// All routes require authentication and team plan
router.use(authenticate);
router.use(checkPlan('team', 'enterprise'));

// Team routes
router.get('/members', getMembers);
router.get('/activity', getTeamActivity);
router.get('/stats', getTeamStats);

// Lead assignment (managers and owners can assign)
router.post('/assign-lead', checkRole('owner', 'manager'), assignLead);

// Owner-only routes
router.post('/invite', checkRole('owner'), inviteMember);
router.delete('/members/:userId', checkRole('owner'), removeMember);
router.patch('/members/:userId/role', checkRole('owner'), updateMemberRole);

module.exports = router;
