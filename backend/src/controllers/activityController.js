const Activity = require('../models/Activity');
const Lead = require('../models/Lead');

// @desc    Get activities for a lead
// @route   GET /api/activities/lead/:leadId
// @access  Private
const getLeadActivities = async (req, res, next) => {
  try {
    const { leadId } = req.params;
    const { type, page = 1, limit = 50 } = req.query;

    // Verify lead belongs to user
    const lead = await Lead.findOne({
      _id: leadId,
      userId: req.user._id,
      isDeleted: false
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Lead not found',
          code: 'NOT_FOUND'
        }
      });
    }

    const result = await Activity.getLeadTimeline(leadId, {
      limit: parseInt(limit),
      page: parseInt(page),
      type
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create activity
// @route   POST /api/activities
// @access  Private
const createActivity = async (req, res, next) => {
  try {
    const { leadId, type, title, description, metadata, timestamp } = req.body;

    // Verify lead belongs to user
    const lead = await Lead.findOne({
      _id: leadId,
      userId: req.user._id,
      isDeleted: false
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Lead not found',
          code: 'NOT_FOUND'
        }
      });
    }

    const activity = await Activity.log({
      userId: req.user._id,
      leadId,
      type,
      title,
      description,
      metadata,
      timestamp: timestamp ? new Date(timestamp) : new Date()
    });

    // Update lead's lastContactedAt for contact activities
    const contactTypes = ['whatsapp_sent', 'call_made', 'call_received', 'email_sent', 'meeting_completed', 'site_visit'];
    if (contactTypes.includes(type)) {
      lead.lastContactedAt = new Date();
      await lead.save();
    }

    res.status(201).json({
      success: true,
      data: {
        activity
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's activity timeline
// @route   GET /api/activities/timeline
// @access  Private
const getActivityTimeline = async (req, res, next) => {
  try {
    const { startDate, endDate, type, page = 1, limit = 50 } = req.query;

    const query = { userId: req.user._id };

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    if (type) {
      query.type = type;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [activities, total] = await Promise.all([
      Activity.find(query)
        .populate('leadId', 'name phone company')
        .populate('performedBy', 'name email')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Activity.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        activities,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get activity stats
// @route   GET /api/activities/stats
// @access  Private
const getActivityStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const matchStage = { userId: req.user._id };
    if (Object.keys(dateFilter).length > 0) {
      matchStage.timestamp = dateFilter;
    }

    const [typeCounts, dailyCounts] = await Promise.all([
      // Count by type
      Activity.aggregate([
        { $match: matchStage },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      // Count by day
      Activity.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } },
        { $limit: 30 }
      ])
    ]);

    const byType = {};
    typeCounts.forEach(t => {
      byType[t._id] = t.count;
    });

    const byDay = {};
    dailyCounts.forEach(d => {
      byDay[d._id] = d.count;
    });

    res.json({
      success: true,
      data: {
        byType,
        byDay,
        total: Object.values(byType).reduce((a, b) => a + b, 0)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Log call activity
// @route   POST /api/activities/call
// @access  Private
const logCall = async (req, res, next) => {
  try {
    const { leadId, duration, outcome, notes, direction = 'outgoing' } = req.body;

    // Verify lead belongs to user
    const lead = await Lead.findOne({
      _id: leadId,
      userId: req.user._id,
      isDeleted: false
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Lead not found',
          code: 'NOT_FOUND'
        }
      });
    }

    const type = direction === 'incoming' ? 'call_received' : 'call_made';
    const title = direction === 'incoming' ? 'Received call' : 'Made call';

    const activity = await Activity.log({
      userId: req.user._id,
      leadId,
      type,
      title,
      description: notes || `${duration ? `Duration: ${duration} seconds. ` : ''}${outcome ? `Outcome: ${outcome}` : ''}`,
      metadata: { duration, outcome, direction }
    });

    // Update lead's lastContactedAt
    lead.lastContactedAt = new Date();
    await lead.save();

    res.status(201).json({
      success: true,
      data: {
        activity
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Log note
// @route   POST /api/activities/note
// @access  Private
const logNote = async (req, res, next) => {
  try {
    const { leadId, content } = req.body;

    // Verify lead belongs to user
    const lead = await Lead.findOne({
      _id: leadId,
      userId: req.user._id,
      isDeleted: false
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Lead not found',
          code: 'NOT_FOUND'
        }
      });
    }

    const activity = await Activity.log({
      userId: req.user._id,
      leadId,
      type: 'note_added',
      title: 'Note added',
      description: content
    });

    res.status(201).json({
      success: true,
      data: {
        activity
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLeadActivities,
  createActivity,
  getActivityTimeline,
  getActivityStats,
  logCall,
  logNote
};
