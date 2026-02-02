const Lead = require('../models/Lead');
const Task = require('../models/Task');
const Activity = require('../models/Activity');

/**
 * AI Recovery Service
 * Identifies leads that need attention and provides recovery suggestions
 */

/**
 * Identify leads that need recovery attention
 * @param {ObjectId} userId - User ID
 * @returns {Object} - Recovery leads data
 */
const identifyRecoveryLeads = async (userId) => {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // Find cold leads (no contact in 7+ days)
  const coldLeads = await Lead.find({
    userId,
    isDeleted: false,
    status: { $nin: ['won', 'lost'] },
    $or: [
      { lastContactedAt: { $lt: sevenDaysAgo } },
      { lastContactedAt: null, createdAt: { $lt: sevenDaysAgo } }
    ]
  })
    .sort({ estimatedValue: -1, lastContactedAt: 1 })
    .limit(10)
    .lean();

  // Find stuck leads (same status for 14+ days)
  const stuckLeads = await Lead.find({
    userId,
    isDeleted: false,
    status: { $in: ['contacted', 'qualified'] },
    updatedAt: { $lt: fourteenDaysAgo }
  })
    .sort({ estimatedValue: -1, updatedAt: 1 })
    .limit(10)
    .lean();

  // Find leads without any tasks scheduled
  const leadsWithNoTasks = await Lead.aggregate([
    {
      $match: {
        userId,
        isDeleted: false,
        status: { $nin: ['won', 'lost'] }
      }
    },
    {
      $lookup: {
        from: 'tasks',
        let: { leadId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$leadId', '$$leadId'] },
              status: 'pending'
            }
          }
        ],
        as: 'pendingTasks'
      }
    },
    {
      $match: { pendingTasks: { $size: 0 } }
    },
    { $sort: { estimatedValue: -1 } },
    { $limit: 10 }
  ]);

  // Process and enhance leads with suggestions
  const coldLeadsWithSuggestions = await Promise.all(
    coldLeads.map(lead => enhanceLeadWithSuggestion(lead, 'cold'))
  );

  const stuckLeadsWithSuggestions = await Promise.all(
    stuckLeads.map(lead => enhanceLeadWithSuggestion(lead, 'stuck'))
  );

  const noTaskLeadsWithSuggestions = await Promise.all(
    leadsWithNoTasks.map(lead => enhanceLeadWithSuggestion(lead, 'no_tasks'))
  );

  // Calculate summary stats
  const allRecoveryLeads = [
    ...coldLeadsWithSuggestions,
    ...stuckLeadsWithSuggestions,
    ...noTaskLeadsWithSuggestions
  ];

  // Remove duplicates (a lead can be in multiple categories)
  const uniqueLeads = [];
  const seenIds = new Set();
  for (const lead of allRecoveryLeads) {
    if (!seenIds.has(lead._id.toString())) {
      seenIds.add(lead._id.toString());
      uniqueLeads.push(lead);
    }
  }

  // Sort by priority score
  uniqueLeads.sort((a, b) => b.recoveryScore - a.recoveryScore);

  // Calculate revenue at risk
  const revenueAtRisk = uniqueLeads.reduce((sum, lead) => sum + (lead.estimatedValue || 0), 0);

  return {
    leads: uniqueLeads.slice(0, 20),
    summary: {
      totalRecoveryLeads: uniqueLeads.length,
      coldLeads: coldLeads.length,
      stuckLeads: stuckLeads.length,
      noTaskLeads: leadsWithNoTasks.length,
      revenueAtRisk
    }
  };
};

/**
 * Enhance lead with AI-generated suggestion
 * @param {Object} lead - Lead document
 * @param {string} category - Category (cold, stuck, no_tasks)
 * @returns {Object} - Enhanced lead with suggestion
 */
const enhanceLeadWithSuggestion = async (lead, category) => {
  // Get recent activity for this lead
  const recentActivity = await Activity.findOne({
    leadId: lead._id
  }).sort({ timestamp: -1 }).lean();

  // Calculate days inactive
  const lastContact = lead.lastContactedAt || lead.createdAt;
  const daysInactive = Math.floor((Date.now() - new Date(lastContact).getTime()) / (1000 * 60 * 60 * 24));

  // Generate suggestion based on category and history
  const suggestion = generateSuggestion(lead, category, recentActivity, daysInactive);

  // Calculate recovery score (higher = more urgent)
  const recoveryScore = calculateRecoveryScore(lead, category, daysInactive);

  return {
    ...lead,
    recovery: {
      category,
      daysInactive,
      lastActivity: recentActivity ? {
        type: recentActivity.type,
        title: recentActivity.title,
        date: recentActivity.timestamp
      } : null,
      suggestion,
      recoveryScore
    },
    recoveryScore
  };
};

/**
 * Generate recovery suggestion
 * @param {Object} lead - Lead document
 * @param {string} category - Recovery category
 * @param {Object} lastActivity - Last activity
 * @param {number} daysInactive - Days since last contact
 * @returns {Object} - Suggestion object
 */
const generateSuggestion = (lead, category, lastActivity, daysInactive) => {
  const suggestions = {
    cold: {
      action: 'send_whatsapp',
      template: 're_engagement',
      title: 'Re-engage via WhatsApp',
      reason: `No contact in ${daysInactive} days`,
      message: 'Send a friendly re-engagement message to reconnect'
    },
    stuck: {
      action: 'schedule_call',
      template: 'follow_up',
      title: 'Schedule a call',
      reason: `Status unchanged for ${daysInactive}+ days`,
      message: 'A direct call might help move this lead forward'
    },
    no_tasks: {
      action: 'create_task',
      template: null,
      title: 'Schedule follow-up',
      reason: 'No pending tasks',
      message: 'Create a follow-up task to stay engaged'
    }
  };

  let suggestion = suggestions[category] || suggestions.cold;

  // Customize based on lead data
  if (lead.priority === 'high' || lead.priority === 'urgent') {
    suggestion = {
      ...suggestion,
      priority: 'urgent',
      message: `High-value lead needs attention. ${suggestion.message}`
    };
  }

  // Check last activity type for better suggestion
  if (lastActivity) {
    if (lastActivity.type === 'whatsapp_sent' && category === 'cold') {
      suggestion = {
        action: 'schedule_call',
        template: null,
        title: 'Try calling instead',
        reason: 'WhatsApp didn\'t get response',
        message: 'Previous WhatsApp didn\'t get a response - try calling'
      };
    }

    if (lastActivity.type === 'call_made' && lastActivity.metadata?.outcome === 'no_answer') {
      suggestion = {
        action: 'send_whatsapp',
        template: 'follow_up',
        title: 'Send WhatsApp',
        reason: 'Call went unanswered',
        message: 'Try reaching out via WhatsApp since call didn\'t connect'
      };
    }
  }

  // Add best time suggestion (mock - in production would use ML)
  const bestTimes = ['10:00 AM', '2:00 PM', '6:00 PM'];
  suggestion.bestTime = bestTimes[Math.floor(Math.random() * bestTimes.length)];

  return suggestion;
};

/**
 * Calculate recovery priority score
 * @param {Object} lead - Lead document
 * @param {string} category - Recovery category
 * @param {number} daysInactive - Days inactive
 * @returns {number} - Priority score (0-100)
 */
const calculateRecoveryScore = (lead, category, daysInactive) => {
  let score = 0;

  // Base score by category
  const categoryScores = {
    cold: 30,
    stuck: 25,
    no_tasks: 20
  };
  score += categoryScores[category] || 20;

  // Add points for value
  if (lead.estimatedValue > 0) {
    if (lead.estimatedValue > 5000000) score += 30; // 50L+
    else if (lead.estimatedValue > 1000000) score += 20; // 10L+
    else if (lead.estimatedValue > 500000) score += 10; // 5L+
  }

  // Add points for priority
  const priorityScores = {
    urgent: 20,
    high: 15,
    medium: 5,
    low: 0
  };
  score += priorityScores[lead.priority] || 0;

  // Add points for inactivity (more inactive = higher priority)
  if (daysInactive > 30) score += 15;
  else if (daysInactive > 14) score += 10;
  else if (daysInactive > 7) score += 5;

  // Add points for advanced status (closer to conversion)
  const statusScores = {
    negotiation: 20,
    proposal: 15,
    qualified: 10,
    contacted: 5,
    new: 0
  };
  score += statusScores[lead.status] || 0;

  return Math.min(score, 100);
};

/**
 * Get recovery stats for dashboard
 * @param {ObjectId} userId - User ID
 * @returns {Object} - Recovery statistics
 */
const getRecoveryStats = async (userId) => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [coldCount, totalActive, revenueAtRisk] = await Promise.all([
    Lead.countDocuments({
      userId,
      isDeleted: false,
      status: { $nin: ['won', 'lost'] },
      $or: [
        { lastContactedAt: { $lt: sevenDaysAgo } },
        { lastContactedAt: null }
      ]
    }),
    Lead.countDocuments({
      userId,
      isDeleted: false,
      status: { $nin: ['won', 'lost'] }
    }),
    Lead.aggregate([
      {
        $match: {
          userId,
          isDeleted: false,
          status: { $nin: ['won', 'lost'] },
          $or: [
            { lastContactedAt: { $lt: sevenDaysAgo } },
            { lastContactedAt: null }
          ]
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$estimatedValue' }
        }
      }
    ])
  ]);

  return {
    coldLeads: coldCount,
    activeLeads: totalActive,
    coldPercentage: totalActive > 0 ? Math.round((coldCount / totalActive) * 100) : 0,
    revenueAtRisk: revenueAtRisk[0]?.total || 0
  };
};

module.exports = {
  identifyRecoveryLeads,
  enhanceLeadWithSuggestion,
  generateSuggestion,
  calculateRecoveryScore,
  getRecoveryStats
};
