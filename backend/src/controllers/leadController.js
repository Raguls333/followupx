const Lead = require('../models/Lead');
const Task = require('../models/Task');
const Activity = require('../models/Activity');
const Papa = require('papaparse');
const { formatIndianPhone } = require('../middleware/validation');

// @desc    Get all leads
// @route   GET /api/leads
// @access  Private
const getLeads = async (req, res, next) => {
  try {
    const {
      status,
      source,
      priority,
      tags,
      search,
      sort = '-createdAt',
      page = 1,
      limit = 20
    } = req.query;


    // Build query
    let query = { isDeleted: false };

    // If owner, show all leads for their team (teamId = their _id or their own leads)
    if (req.user.role === 'owner') {
      // Find all users in the team (including self)
      const User = require('../models/User');
      const teamUsers = await User.find({
        $or: [
          { teamId: req.user._id },
          { _id: req.user._id }
        ]
      }).select('_id');
      const teamUserIds = teamUsers.map(u => u._id);
      query.userId = { $in: teamUserIds };
    } else {
      query.userId = req.user._id;
    }

    if (status) {
      query.status = status;
    }

    if (source) {
      query.source = source;
    }

    if (priority) {
      query.priority = priority;
    }

    if (tags) {
      const tagArray = tags.split(',').map(t => t.trim());
      query.tags = { $in: tagArray };
    }

    // Search using text index
    if (search) {
      query.$text = { $search: search };
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const [leads, total] = await Promise.all([
      Lead.find(query)
        .populate('userId', 'name email role')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Lead.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        leads,
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

// @desc    Get single lead
// @route   GET /api/leads/:id
// @access  Private
const getLead = async (req, res, next) => {
  try {
    const lead = await Lead.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isDeleted: false
    }).populate('userId', 'name email role');

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Lead not found',
          code: 'NOT_FOUND'
        }
      });
    }

    // Get related tasks
    const tasks = await Task.find({
      leadId: lead._id,
      status: 'pending'
    }).sort({ dueDate: 1 }).limit(5).lean();

    // Get recent activities
    const activities = await Activity.find({
      leadId: lead._id
    }).sort({ timestamp: -1 }).limit(10).lean();

    res.json({
      success: true,
      data: {
        lead,
        tasks,
        activities
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create lead
// @route   POST /api/leads
// @access  Private
const createLead = async (req, res, next) => {
  try {
    const {
      name,
      phone,
      email,
      company,
      status,
      source,
      tags,
      priority,
      estimatedValue,
      notes,
      propertyInterest
    } = req.body;

    // Check for duplicate phone
    const existingLead = await Lead.findDuplicate(req.user._id, phone);
    if (existingLead) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'A lead with this phone number already exists',
          code: 'DUPLICATE_PHONE',
          existingLead: {
            id: existingLead._id,
            name: existingLead.name,
            status: existingLead.status
          }
        }
      });
    }

    // Create lead
    const lead = await Lead.create({
      userId: req.user._id,
      name,
      phone,
      email,
      company,
      status: status || 'new',
      source: source || 'other',
      tags: tags || [],
      priority: priority || 'medium',
      estimatedValue: estimatedValue || 0,
      notes,
      propertyInterest
    });

    // Log activity
    await Activity.log({
      userId: req.user._id,
      leadId: lead._id,
      type: 'lead_created',
      title: 'Lead created',
      description: `New lead ${lead.fullName} was created`,
      metadata: { source }
    });

    // Populate userId before returning
    await lead.populate('userId', 'name email role');

    res.status(201).json({
      success: true,
      data: {
        lead
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update lead
// @route   PUT /api/leads/:id
// @access  Private
const updateLead = async (req, res, next) => {
  try {
    const {
      name,
      phone,
      email,
      company,
      source,
      tags,
      priority,
      estimatedValue,
      actualValue,
      notes,
      propertyInterest
    } = req.body;

    const lead = await Lead.findOne({
      _id: req.params.id,
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

    // Check for duplicate phone if phone is being changed
    if (phone && phone !== lead.phone) {
      const existingLead = await Lead.findDuplicate(req.user._id, phone);
      if (existingLead && existingLead._id.toString() !== lead._id.toString()) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'A lead with this phone number already exists',
            code: 'DUPLICATE_PHONE'
          }
        });
      }
    }

    // Track changes for activity log
    const changes = [];
    if (name?.first && name.first !== lead.name.first) changes.push('name');
    if (phone && phone !== lead.phone) changes.push('phone');
    if (email && email !== lead.email) changes.push('email');
    if (company && company !== lead.company) changes.push('company');
    if (priority && priority !== lead.priority) changes.push('priority');

    // Update fields
    if (name) lead.name = { ...lead.name, ...name };
    if (phone) lead.phone = phone;
    if (email !== undefined) lead.email = email;
    if (company !== undefined) lead.company = company;
    if (source) lead.source = source;
    if (tags) lead.tags = tags;
    if (priority) lead.priority = priority;
    if (estimatedValue !== undefined) lead.estimatedValue = estimatedValue;
    if (actualValue !== undefined) lead.actualValue = actualValue;
    if (notes !== undefined) lead.notes = notes;
    if (propertyInterest) lead.propertyInterest = { ...lead.propertyInterest, ...propertyInterest };

    await lead.save();

    // Log activity if there were changes
    if (changes.length > 0) {
      await Activity.log({
        userId: req.user._id,
        leadId: lead._id,
        type: 'lead_updated',
        title: 'Lead updated',
        description: `Updated: ${changes.join(', ')}`,
        metadata: { changes }
      });
    }

    // Populate userId before returning
    await lead.populate('userId', 'name email role');

    res.json({
      success: true,
      data: {
        lead
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update lead status
// @route   PATCH /api/leads/:id/status
// @access  Private
const updateLeadStatus = async (req, res, next) => {
  try {
    const { status, lostReason } = req.body;

    const lead = await Lead.findOne({
      _id: req.params.id,
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

    // Validate lost reason if status is lost
    if (status === 'lost' && !lostReason) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Lost reason is required when marking a lead as lost',
          code: 'LOST_REASON_REQUIRED'
        }
      });
    }

    const previousStatus = lead.status;
    lead.status = status;

    // Set timestamps based on status
    if (status === 'won') {
      lead.wonAt = new Date();
      lead.lostAt = null;
      lead.lostReason = null;
    } else if (status === 'lost') {
      lead.lostAt = new Date();
      lead.lostReason = lostReason;
      lead.wonAt = null;
    }

    await lead.save();

    // Log activity
    let activityType = 'status_changed';
    let activityTitle = `Status changed to ${status}`;

    if (status === 'won') {
      activityType = 'deal_won';
      activityTitle = 'Deal won!';
    } else if (status === 'lost') {
      activityType = 'deal_lost';
      activityTitle = 'Deal lost';
    }

    await Activity.log({
      userId: req.user._id,
      leadId: lead._id,
      type: activityType,
      title: activityTitle,
      description: status === 'lost' ? `Reason: ${lostReason}` : `Changed from ${previousStatus} to ${status}`,
      metadata: { previousStatus, newStatus: status, lostReason }
    });

    // Populate userId before returning
    await lead.populate('userId', 'name email role');

    res.json({
      success: true,
      data: {
        lead
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete lead (soft delete)
// @route   DELETE /api/leads/:id
// @access  Private
const deleteLead = async (req, res, next) => {
  try {
    const lead = await Lead.findOne({
      _id: req.params.id,
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

    // Soft delete
    lead.isDeleted = true;
    lead.deletedAt = new Date();
    await lead.save();

    // Cancel all pending tasks
    await Task.updateMany(
      { leadId: lead._id, status: 'pending' },
      { status: 'cancelled' }
    );

    res.json({
      success: true,
      message: 'Lead deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Import leads from CSV
// @route   POST /api/leads/import
// @access  Private
const importLeads = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Please upload a CSV file',
          code: 'NO_FILE'
        }
      });
    }

    const csvData = req.file.buffer.toString('utf8');
    const parsed = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.toLowerCase().trim().replace(/\s+/g, '_')
    });

    if (parsed.errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Error parsing CSV file',
          code: 'PARSE_ERROR',
          details: parsed.errors.slice(0, 5)
        }
      });
    }

    const results = {
      imported: 0,
      skipped: 0,
      errors: []
    };

    const leadsToInsert = [];

    for (let i = 0; i < parsed.data.length; i++) {
      const row = parsed.data[i];
      const rowNum = i + 2; // Account for header row

      try {
        // Extract and validate data
        const firstName = row.first_name || row.firstname || row.name?.split(' ')[0] || '';
        const lastName = row.last_name || row.lastname || row.name?.split(' ').slice(1).join(' ') || '';
        const phone = formatIndianPhone(row.phone || row.mobile || row.contact || '');
        const email = row.email || '';
        const company = row.company || row.organization || '';
        const source = row.source || 'other';
        const notes = row.notes || row.remarks || '';

        // Validate required fields
        if (!firstName) {
          results.errors.push({ row: rowNum, reason: 'Missing first name' });
          results.skipped++;
          continue;
        }

        if (!phone) {
          results.errors.push({ row: rowNum, reason: 'Invalid or missing phone number' });
          results.skipped++;
          continue;
        }

        leadsToInsert.push({
          userId: req.user._id,
          name: { first: firstName.trim(), last: lastName.trim() },
          phone,
          email: email.trim(),
          company: company.trim(),
          source: ['website', 'referral', 'cold_call', 'social_media', 'advertisement', 'walk_in', 'trade_show', 'other'].includes(source.toLowerCase()) ? source.toLowerCase() : 'other',
          notes: notes.trim(),
          status: 'new'
        });
      } catch (error) {
        results.errors.push({ row: rowNum, reason: error.message });
        results.skipped++;
      }
    }

    // Check for duplicates in batch
    if (leadsToInsert.length > 0) {
      const phones = leadsToInsert.map(l => l.phone);
      const existingLeads = await Lead.find({
        userId: req.user._id,
        phone: { $in: phones },
        isDeleted: false
      }).select('phone').lean();

      const existingPhones = new Set(existingLeads.map(l => l.phone));

      // Filter out duplicates
      const uniqueLeads = [];
      for (const lead of leadsToInsert) {
        if (existingPhones.has(lead.phone)) {
          results.errors.push({
            row: leadsToInsert.indexOf(lead) + 2,
            reason: 'Phone number already exists'
          });
          results.skipped++;
        } else {
          uniqueLeads.push(lead);
        }
      }

      // Bulk insert
      if (uniqueLeads.length > 0) {
        const inserted = await Lead.insertMany(uniqueLeads, { ordered: false });
        results.imported = inserted.length;

        // Create activities for imported leads
        const activities = inserted.map(lead => ({
          userId: req.user._id,
          leadId: lead._id,
          type: 'lead_created',
          title: 'Lead imported',
          description: `Lead imported from CSV`,
          metadata: { source: 'csv_import' }
        }));
        await Activity.insertMany(activities);
      }
    }

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check for duplicate phone
// @route   POST /api/leads/check-duplicate
// @access  Private
const checkDuplicate = async (req, res, next) => {
  try {
    const { phone } = req.body;

    const formattedPhone = formatIndianPhone(phone);
    if (!formattedPhone) {
      return res.json({
        success: true,
        data: {
          exists: false,
          lead: null
        }
      });
    }

    const existingLead = await Lead.findDuplicate(req.user._id, formattedPhone);

    res.json({
      success: true,
      data: {
        exists: !!existingLead,
        lead: existingLead ? {
          id: existingLead._id,
          name: existingLead.name,
          status: existingLead.status,
          phone: existingLead.phone
        } : null
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get AI recovery leads
// @route   GET /api/leads/ai-recovery
// @access  Private
const getAIRecoveryLeads = async (req, res, next) => {
  try {
    const aiRecoveryService = require('../services/aiRecoveryService');
    const recoveryLeads = await aiRecoveryService.identifyRecoveryLeads(req.user._id);

    res.json({
      success: true,
      data: recoveryLeads
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get lead stats
// @route   GET /api/leads/stats
// @access  Private
const getLeadStats = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const [statusCounts, sourceCounts, totalValue] = await Promise.all([
      // Count by status
      Lead.aggregate([
        { $match: { userId, isDeleted: false } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      // Count by source
      Lead.aggregate([
        { $match: { userId, isDeleted: false } },
        { $group: { _id: '$source', count: { $sum: 1 } } }
      ]),
      // Total estimated value
      Lead.aggregate([
        { $match: { userId, isDeleted: false, status: { $nin: ['lost'] } } },
        { $group: { _id: null, total: { $sum: '$estimatedValue' } } }
      ])
    ]);

    // Format status counts
    const byStatus = {};
    statusCounts.forEach(s => {
      byStatus[s._id] = s.count;
    });

    // Format source counts
    const bySource = {};
    sourceCounts.forEach(s => {
      bySource[s._id] = s.count;
    });

    res.json({
      success: true,
      data: {
        byStatus,
        bySource,
        totalEstimatedValue: totalValue[0]?.total || 0,
        total: Object.values(byStatus).reduce((a, b) => a + b, 0)
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
