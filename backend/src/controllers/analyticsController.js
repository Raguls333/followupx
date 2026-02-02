const Lead = require('../models/Lead');
const Task = require('../models/Task');
const Activity = require('../models/Activity');

// @desc    Get overview stats
// @route   GET /api/analytics/overview
// @access  Private
const getOverview = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    // Default to current month
    const now = new Date();
    const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Calculate previous period for comparison
    const periodLength = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - periodLength);
    const prevEnd = new Date(start.getTime() - 1);

    const userId = req.user._id;

    const [
      totalLeads,
      leadsInPeriod,
      leadsInPrevPeriod,
      activeLeadsCount,
      coldLeadsCount,
      tasksCompleted,
      tasksCompletedPrev,
      totalTasks,
      dealsWon,
      dealsLost
    ] = await Promise.all([
      // Total leads
      Lead.countDocuments({ userId, isDeleted: false }),

      // Leads created in period
      Lead.countDocuments({
        userId,
        isDeleted: false,
        createdAt: { $gte: start, $lte: end }
      }),

      // Leads created in previous period
      Lead.countDocuments({
        userId,
        isDeleted: false,
        createdAt: { $gte: prevStart, $lte: prevEnd }
      }),

      // Active leads (have pending tasks)
      Task.distinct('leadId', {
        userId,
        status: 'pending'
      }).then(ids => Lead.countDocuments({
        userId,
        _id: { $in: ids },
        isDeleted: false,
        status: { $nin: ['won', 'lost'] }
      })),

      // Cold leads (no contact in 7 days)
      Lead.countDocuments({
        userId,
        isDeleted: false,
        status: { $nin: ['won', 'lost'] },
        $or: [
          { lastContactedAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
          { lastContactedAt: null }
        ]
      }),

      // Tasks completed in period
      Task.countDocuments({
        userId,
        status: 'completed',
        completedAt: { $gte: start, $lte: end }
      }),

      // Tasks completed in previous period
      Task.countDocuments({
        userId,
        status: 'completed',
        completedAt: { $gte: prevStart, $lte: prevEnd }
      }),

      // Total tasks in period
      Task.countDocuments({
        userId,
        createdAt: { $gte: start, $lte: end }
      }),

      // Deals won in period
      Lead.countDocuments({
        userId,
        status: 'won',
        wonAt: { $gte: start, $lte: end }
      }),

      // Deals lost in period
      Lead.countDocuments({
        userId,
        status: 'lost',
        lostAt: { $gte: start, $lte: end }
      })
    ]);

    // Calculate metrics
    const taskCompletionRate = totalTasks > 0 ? Math.round((tasksCompleted / totalTasks) * 100) : 0;

    // Calculate trends
    const leadsTrend = leadsInPrevPeriod > 0
      ? Math.round(((leadsInPeriod - leadsInPrevPeriod) / leadsInPrevPeriod) * 100)
      : leadsInPeriod > 0 ? 100 : 0;

    const tasksTrend = tasksCompletedPrev > 0
      ? Math.round(((tasksCompleted - tasksCompletedPrev) / tasksCompletedPrev) * 100)
      : tasksCompleted > 0 ? 100 : 0;

    res.json({
      success: true,
      data: {
        totalLeads,
        newLeads: leadsInPeriod,
        activeLeads: activeLeadsCount,
        coldLeads: coldLeadsCount,
        tasksCompleted,
        taskCompletionRate,
        dealsWon,
        dealsLost,
        winRate: dealsWon + dealsLost > 0 ? Math.round((dealsWon / (dealsWon + dealsLost)) * 100) : 0,
        trends: {
          leads: leadsTrend,
          tasks: tasksTrend
        },
        period: {
          start,
          end
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get sales funnel data
// @route   GET /api/analytics/funnel
// @access  Private
const getFunnel = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const statusCounts = await Lead.aggregate([
      { $match: { userId, isDeleted: false } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Build funnel data
    const funnel = {
      new: 0,
      contacted: 0,
      qualified: 0,
      proposal: 0,
      negotiation: 0,
      won: 0,
      lost: 0
    };

    statusCounts.forEach(s => {
      funnel[s._id] = s.count;
    });

    // Calculate conversion rates
    const stages = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won'];
    const conversionRates = {};

    for (let i = 0; i < stages.length - 1; i++) {
      const current = stages[i];
      const next = stages[i + 1];
      const currentCount = funnel[current];
      const nextCount = funnel[next];

      // Get leads that moved from current to next stage
      const movedCount = nextCount; // Simplified - all leads in next stage came from previous

      conversionRates[`${current}_to_${next}`] = currentCount > 0
        ? Math.round((nextCount / currentCount) * 100)
        : 0;
    }

    // Overall conversion rate (new to won)
    const totalLeads = Object.values(funnel).reduce((a, b) => a + b, 0);
    conversionRates.overall = totalLeads > 0
      ? Math.round((funnel.won / totalLeads) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        funnel,
        conversionRates,
        total: totalLeads
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get activity analytics
// @route   GET /api/analytics/activities
// @access  Private
const getActivityAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const now = new Date();
    const start = startDate ? new Date(startDate) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : now;

    const userId = req.user._id;

    const [typeCounts, dailyCounts, hourCounts] = await Promise.all([
      // Count by type
      Activity.aggregate([
        {
          $match: {
            userId,
            timestamp: { $gte: start, $lte: end }
          }
        },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),

      // Count by day
      Activity.aggregate([
        {
          $match: {
            userId,
            timestamp: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // Count by hour of day
      Activity.aggregate([
        {
          $match: {
            userId,
            timestamp: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: { $hour: '$timestamp' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    // Format data
    const byType = {};
    typeCounts.forEach(t => {
      byType[t._id] = t.count;
    });

    const byDay = {};
    dailyCounts.forEach(d => {
      byDay[d._id] = d.count;
    });

    const byHour = {};
    hourCounts.forEach(h => {
      byHour[h._id] = h.count;
    });

    // Find most active times
    const maxHour = hourCounts.length > 0
      ? hourCounts.reduce((max, h) => h.count > max.count ? h : max)
      : { _id: 0, count: 0 };

    res.json({
      success: true,
      data: {
        byType,
        byDay,
        byHour,
        summary: {
          totalActivities: Object.values(byType).reduce((a, b) => a + b, 0),
          whatsappSent: byType.whatsapp_sent || 0,
          callsMade: byType.call_made || 0,
          emailsSent: byType.email_sent || 0,
          tasksCompleted: byType.task_completed || 0,
          mostActiveHour: maxHour._id
        },
        period: { start, end }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get revenue analytics
// @route   GET /api/analytics/revenue
// @access  Private
const getRevenue = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const now = new Date();
    const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate) : now;

    const userId = req.user._id;

    const [wonDeals, pipelineValue, avgDealSize, wonByMonth] = await Promise.all([
      // Total won deals value
      Lead.aggregate([
        {
          $match: {
            userId,
            status: 'won',
            wonAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $ifNull: ['$actualValue', '$estimatedValue'] } },
            count: { $sum: 1 }
          }
        }
      ]),

      // Pipeline value (qualified + proposal + negotiation)
      Lead.aggregate([
        {
          $match: {
            userId,
            isDeleted: false,
            status: { $in: ['qualified', 'proposal', 'negotiation'] }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$estimatedValue' },
            count: { $sum: 1 }
          }
        }
      ]),

      // Average deal size
      Lead.aggregate([
        {
          $match: {
            userId,
            status: 'won'
          }
        },
        {
          $group: {
            _id: null,
            avg: { $avg: { $ifNull: ['$actualValue', '$estimatedValue'] } }
          }
        }
      ]),

      // Won deals by month
      Lead.aggregate([
        {
          $match: {
            userId,
            status: 'won',
            wonAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m', date: '$wonAt' }
            },
            total: { $sum: { $ifNull: ['$actualValue', '$estimatedValue'] } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    // Calculate win rate
    const wonCount = wonDeals[0]?.count || 0;
    const lostCount = await Lead.countDocuments({
      userId,
      status: 'lost',
      lostAt: { $gte: start, $lte: end }
    });

    const winRate = (wonCount + lostCount) > 0
      ? Math.round((wonCount / (wonCount + lostCount)) * 100)
      : 0;

    // Format monthly data
    const byMonth = {};
    wonByMonth.forEach(m => {
      byMonth[m._id] = {
        revenue: m.total,
        deals: m.count
      };
    });

    res.json({
      success: true,
      data: {
        wonDeals: {
          value: wonDeals[0]?.total || 0,
          count: wonDeals[0]?.count || 0
        },
        pipeline: {
          value: pipelineValue[0]?.total || 0,
          count: pipelineValue[0]?.count || 0
        },
        averageDealSize: avgDealSize[0]?.avg || 0,
        winRate,
        byMonth,
        period: { start, end }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export data
// @route   GET /api/analytics/export
// @access  Private
const exportData = async (req, res, next) => {
  try {
    const { dataType, format = 'csv' } = req.query;

    const userId = req.user._id;
    let data = [];
    let filename = '';
    let headers = [];

    switch (dataType) {
      case 'leads':
        data = await Lead.find({ userId, isDeleted: false }).lean();
        filename = 'leads_export';
        headers = ['Name', 'Phone', 'Email', 'Company', 'Status', 'Source', 'Priority', 'Estimated Value', 'Created At'];
        data = data.map(l => ({
          Name: `${l.name.first} ${l.name.last || ''}`.trim(),
          Phone: l.phone,
          Email: l.email || '',
          Company: l.company || '',
          Status: l.status,
          Source: l.source,
          Priority: l.priority,
          'Estimated Value': l.estimatedValue,
          'Created At': l.createdAt.toISOString().split('T')[0]
        }));
        break;

      case 'tasks':
        data = await Task.find({ userId }).populate('leadId', 'name').lean();
        filename = 'tasks_export';
        headers = ['Title', 'Type', 'Lead', 'Status', 'Due Date', 'Priority', 'Completed At'];
        data = data.map(t => ({
          Title: t.title,
          Type: t.type,
          Lead: t.leadId ? `${t.leadId.name.first} ${t.leadId.name.last || ''}`.trim() : '',
          Status: t.status,
          'Due Date': t.dueDate.toISOString().split('T')[0],
          Priority: t.priority,
          'Completed At': t.completedAt ? t.completedAt.toISOString().split('T')[0] : ''
        }));
        break;

      case 'activities':
        data = await Activity.find({ userId }).populate('leadId', 'name').lean();
        filename = 'activities_export';
        headers = ['Type', 'Title', 'Lead', 'Description', 'Timestamp'];
        data = data.map(a => ({
          Type: a.type,
          Title: a.title,
          Lead: a.leadId ? `${a.leadId.name.first} ${a.leadId.name.last || ''}`.trim() : '',
          Description: a.description || '',
          Timestamp: a.timestamp.toISOString()
        }));
        break;

      default:
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid data type',
            code: 'INVALID_DATA_TYPE'
          }
        });
    }

    if (format === 'csv') {
      // Generate CSV
      const headerRow = headers.join(',');
      const dataRows = data.map(row =>
        headers.map(h => {
          const val = row[h] || '';
          // Escape quotes and wrap in quotes if contains comma
          const escaped = String(val).replace(/"/g, '""');
          return escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')
            ? `"${escaped}"`
            : escaped;
        }).join(',')
      );

      const csv = [headerRow, ...dataRows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}_${new Date().toISOString().split('T')[0]}.csv"`);
      return res.send(csv);
    }

    // JSON format
    res.json({
      success: true,
      data: {
        records: data,
        count: data.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get dashboard summary
// @route   GET /api/analytics/dashboard
// @access  Private
const getDashboard = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const [
      todaysTasks,
      overdueTasks,
      recentLeads,
      recentActivities,
      quickStats
    ] = await Promise.all([
      // Today's tasks
      Task.find({
        userId,
        status: 'pending',
        dueDate: { $gte: todayStart, $lte: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1) }
      })
        .populate('leadId', 'name phone')
        .sort({ dueDate: 1 })
        .limit(5)
        .lean(),

      // Overdue tasks count
      Task.countDocuments({
        userId,
        status: 'pending',
        dueDate: { $lt: todayStart }
      }),

      // Recent leads
      Lead.find({ userId, isDeleted: false })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),

      // Recent activities
      Activity.find({ userId })
        .populate('leadId', 'name')
        .sort({ timestamp: -1 })
        .limit(10)
        .lean(),

      // Quick stats
      Promise.all([
        Lead.countDocuments({ userId, isDeleted: false }),
        Lead.countDocuments({ userId, isDeleted: false, status: { $nin: ['won', 'lost'] } }),
        Task.countDocuments({ userId, status: 'pending' }),
        Lead.countDocuments({
          userId,
          status: 'won',
          wonAt: { $gte: new Date(now.getFullYear(), now.getMonth(), 1) }
        })
      ])
    ]);

    res.json({
      success: true,
      data: {
        todaysTasks,
        overdueTasks,
        recentLeads,
        recentActivities,
        stats: {
          totalLeads: quickStats[0],
          activeLeads: quickStats[1],
          pendingTasks: quickStats[2],
          dealsWonThisMonth: quickStats[3]
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOverview,
  getFunnel,
  getActivityAnalytics,
  getRevenue,
  exportData,
  getDashboard
};
