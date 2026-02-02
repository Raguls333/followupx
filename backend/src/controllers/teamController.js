const User = require('../models/User');
const Lead = require('../models/Lead');
const Task = require('../models/Task');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const emailService = require('../services/emailService');
const crypto = require('crypto');

// @desc    Get team members
// @route   GET /api/team/members
// @access  Private (Team plan)
const getMembers = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Get team members (users where teamId points to current user)
    const members = await User.find({
      $or: [
        { _id: userId }, // Include self
        { teamId: userId } // Team members
      ]
    }).select('-password').lean();

    // Get stats for each member
    const membersWithStats = await Promise.all(
      members.map(async (member) => {
        const [leadsCount, tasksCount, completedTasks] = await Promise.all([
          Lead.countDocuments({ userId: member._id, isDeleted: false }),
          Task.countDocuments({ userId: member._id, status: 'pending' }),
          Task.countDocuments({
            userId: member._id,
            status: 'completed',
            completedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          })
        ]);

        return {
          ...member,
          stats: {
            leadsCount,
            pendingTasks: tasksCount,
            completedTasksLast30Days: completedTasks
          }
        };
      })
    );

    res.json({
      success: true,
      data: {
        members: membersWithStats,
        count: members.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Invite team member
// @route   POST /api/team/invite
// @access  Private (Team plan, Owner only)
const inviteMember = async (req, res, next) => {
  try {
    const { email, role = 'rep', permissions } = req.body;

    // Check if email already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // Check if already in this team
      if (existingUser.teamId?.toString() === req.user._id.toString()) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'User is already a member of your team',
            code: 'ALREADY_MEMBER'
          }
        });
      }

      // Check if user is owner of another team
      if (existingUser.role === 'owner') {
        return res.status(400).json({
          success: false,
          error: {
            message: 'This user is an owner of another account',
            code: 'USER_IS_OWNER'
          }
        });
      }

      return res.status(400).json({
        success: false,
        error: {
          message: 'User with this email already exists',
          code: 'EMAIL_EXISTS'
        }
      });
    }

    // Generate invitation token
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Store invitation (you might want a separate Invitation model in production)
    // For MVP, we'll create a placeholder user
    const invitedUser = await User.create({
      name: 'Invited User',
      email,
      password: crypto.randomBytes(16).toString('hex'), // Temp password
      role,
      teamId: req.user._id,
      isActive: false, // Not active until they complete registration
      emailVerificationToken: inviteToken,
      plan: req.user.plan // Inherit team plan
    });

    // Send invitation email
    const inviteUrl = `${process.env.FRONTEND_URL}/invite/${inviteToken}`;
    await emailService.sendTeamInvite(email, {
      inviterName: req.user.name,
      teamName: req.user.company || `${req.user.name}'s Team`,
      inviteUrl,
      role
    });

    res.status(201).json({
      success: true,
      message: 'Invitation sent successfully',
      data: {
        email,
        role,
        expiresAt: inviteExpires
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove team member
// @route   DELETE /api/team/members/:userId
// @access  Private (Team plan, Owner only)
const removeMember = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Cannot remove self
    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Cannot remove yourself from the team',
          code: 'CANNOT_REMOVE_SELF'
        }
      });
    }

    const member = await User.findOne({
      _id: userId,
      teamId: req.user._id
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Team member not found',
          code: 'NOT_FOUND'
        }
      });
    }

    // Reassign member's leads to owner
    await Lead.updateMany(
      { userId: member._id },
      { userId: req.user._id }
    );

    // Reassign member's tasks to owner
    await Task.updateMany(
      { userId: member._id },
      { userId: req.user._id }
    );

    // Update activities
    await Activity.updateMany(
      { userId: member._id },
      { performedBy: member._id } // Keep original performer for audit
    );

    // Remove from team
    member.teamId = null;
    member.role = 'owner'; // They become owner of their own account
    member.plan = 'free';
    await member.save();

    res.json({
      success: true,
      message: 'Team member removed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update team member role
// @route   PATCH /api/team/members/:userId/role
// @access  Private (Team plan, Owner only)
const updateMemberRole = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    // Validate role
    if (!['manager', 'rep'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid role. Must be manager or rep',
          code: 'INVALID_ROLE'
        }
      });
    }

    // Cannot change own role
    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Cannot change your own role',
          code: 'CANNOT_CHANGE_OWN_ROLE'
        }
      });
    }

    const member = await User.findOneAndUpdate(
      { _id: userId, teamId: req.user._id },
      { role },
      { new: true }
    ).select('-password');

    if (!member) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Team member not found',
          code: 'NOT_FOUND'
        }
      });
    }

    res.json({
      success: true,
      data: {
        member
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign lead to team member
// @route   POST /api/team/assign-lead
// @access  Private (Team plan)
const assignLead = async (req, res, next) => {
  try {
    const { leadId, userId, reason } = req.body;

    // Verify target user is in team
    const targetUser = await User.findOne({
      $or: [
        { _id: userId, teamId: req.user._id },
        { _id: userId, _id: req.user._id } // Owner can assign to self
      ]
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Team member not found',
          code: 'MEMBER_NOT_FOUND'
        }
      });
    }

    // Get and update lead
    const lead = await Lead.findOne({
      _id: leadId,
      $or: [
        { userId: req.user._id },
        { userId: { $in: await User.find({ teamId: req.user._id }).distinct('_id') } }
      ],
      isDeleted: false
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Lead not found',
          code: 'LEAD_NOT_FOUND'
        }
      });
    }

    const previousOwner = lead.userId;
    lead.userId = targetUser._id;
    await lead.save();

    // Transfer pending tasks
    await Task.updateMany(
      { leadId: lead._id, status: 'pending' },
      { assignedTo: targetUser._id }
    );

    // Log activity
    await Activity.log({
      userId: req.user._id,
      leadId: lead._id,
      type: 'lead_assigned',
      title: 'Lead assigned',
      description: `Assigned to ${targetUser.name}${reason ? ` - ${reason}` : ''}`,
      performedBy: req.user._id,
      metadata: {
        previousOwner,
        newOwner: targetUser._id,
        reason
      }
    });

    // Create notification for new owner
    if (targetUser._id.toString() !== req.user._id.toString()) {
      await Notification.notify({
        userId: targetUser._id,
        type: 'lead_assigned',
        title: 'New Lead Assigned',
        message: `${req.user.name} assigned ${lead.fullName} to you`,
        leadId: lead._id,
        actionUrl: `/leads/${lead._id}`
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

// @desc    Get team activity feed
// @route   GET /api/team/activity
// @access  Private (Team plan)
const getTeamActivity = async (req, res, next) => {
  try {
    const { userId, startDate, endDate, page = 1, limit = 50 } = req.query;

    // Get all team member IDs
    const teamMemberIds = await User.find({
      $or: [
        { _id: req.user._id },
        { teamId: req.user._id }
      ]
    }).distinct('_id');

    const query = {
      userId: { $in: teamMemberIds }
    };

    if (userId) {
      query.userId = userId;
    }

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [activities, total] = await Promise.all([
      Activity.find(query)
        .populate('userId', 'name email')
        .populate('performedBy', 'name email')
        .populate('leadId', 'name phone')
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

// @desc    Get team stats
// @route   GET /api/team/stats
// @access  Private (Team plan)
const getTeamStats = async (req, res, next) => {
  try {
    // Get all team member IDs
    const teamMemberIds = await User.find({
      $or: [
        { _id: req.user._id },
        { teamId: req.user._id }
      ]
    }).distinct('_id');

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalLeads,
      activeLeads,
      totalTasks,
      completedTasks,
      dealsWon,
      memberStats
    ] = await Promise.all([
      Lead.countDocuments({ userId: { $in: teamMemberIds }, isDeleted: false }),
      Lead.countDocuments({
        userId: { $in: teamMemberIds },
        isDeleted: false,
        status: { $nin: ['won', 'lost'] }
      }),
      Task.countDocuments({ userId: { $in: teamMemberIds } }),
      Task.countDocuments({
        userId: { $in: teamMemberIds },
        status: 'completed',
        completedAt: { $gte: monthStart }
      }),
      Lead.countDocuments({
        userId: { $in: teamMemberIds },
        status: 'won',
        wonAt: { $gte: monthStart }
      }),
      // Stats per member
      User.aggregate([
        { $match: { _id: { $in: teamMemberIds } } },
        {
          $lookup: {
            from: 'leads',
            let: { userId: '$_id' },
            pipeline: [
              { $match: { $expr: { $eq: ['$userId', '$$userId'] }, isDeleted: false } },
              { $count: 'count' }
            ],
            as: 'leadsCount'
          }
        },
        {
          $lookup: {
            from: 'tasks',
            let: { userId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$userId', '$$userId'] },
                  status: 'completed',
                  completedAt: { $gte: monthStart }
                }
              },
              { $count: 'count' }
            ],
            as: 'completedTasks'
          }
        },
        {
          $project: {
            name: 1,
            email: 1,
            role: 1,
            leadsCount: { $ifNull: [{ $arrayElemAt: ['$leadsCount.count', 0] }, 0] },
            completedTasks: { $ifNull: [{ $arrayElemAt: ['$completedTasks.count', 0] }, 0] }
          }
        }
      ])
    ]);

    res.json({
      success: true,
      data: {
        team: {
          totalLeads,
          activeLeads,
          totalTasks,
          completedTasksThisMonth: completedTasks,
          dealsWonThisMonth: dealsWon,
          memberCount: teamMemberIds.length
        },
        members: memberStats
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMembers,
  inviteMember,
  removeMember,
  updateMemberRole,
  assignLead,
  getTeamActivity,
  getTeamStats
};
