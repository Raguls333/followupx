const Agenda = require('agenda');
const mongoose = require('mongoose');

let agenda;

const initAgenda = () => {
  agenda = new Agenda({
    mongo: mongoose.connection.db,
    db: { collection: 'scheduledJobs' },
    processEvery: '1 minute',
    maxConcurrency: 20,
    defaultConcurrency: 5
  });

  // Define job handlers
  defineJobs();

  return agenda;
};

const defineJobs = () => {
  // Job 1: Send task reminder
  agenda.define('send-task-reminder', async (job) => {
    const { taskId, userId, leadId } = job.attrs.data;
    const Task = require('../models/Task');
    const Notification = require('../models/Notification');
    const User = require('../models/User');
    const emailService = require('../services/emailService');

    try {
      const task = await Task.findById(taskId).populate('leadId');
      if (!task || task.status !== 'pending') {
        return; // Task already completed or doesn't exist
      }

      // Create in-app notification
      await Notification.create({
        userId,
        type: 'task_reminder',
        title: 'Task Reminder',
        message: `Reminder: ${task.title} for ${task.leadId?.name?.first || 'Unknown'}`,
        taskId,
        leadId,
        actionUrl: `/tasks/${taskId}`
      });

      // Check if user wants email notifications
      const user = await User.findById(userId);
      if (user?.settings?.notifications?.emailReminders) {
        await emailService.sendTaskReminder(user, task);
      }

      // Mark reminder as sent
      await Task.findByIdAndUpdate(taskId, { reminderSent: true });

      console.log(`Task reminder sent for task ${taskId}`);
    } catch (error) {
      console.error('Error sending task reminder:', error);
    }
  });

  // Job 2: Daily overdue scan
  agenda.define('daily-overdue-scan', async (job) => {
    const Task = require('../models/Task');
    const Notification = require('../models/Notification');
    const User = require('../models/User');

    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Find all overdue tasks that haven't been notified
      const overdueTasks = await Task.find({
        dueDate: { $lt: todayStart },
        status: 'pending',
        overdueNotified: { $ne: true }
      }).populate('userId leadId');

      // Group by user
      const tasksByUser = {};
      overdueTasks.forEach(task => {
        const uid = task.userId._id.toString();
        if (!tasksByUser[uid]) {
          tasksByUser[uid] = { user: task.userId, tasks: [] };
        }
        tasksByUser[uid].tasks.push(task);
      });

      // Create notifications for each user
      for (const uid in tasksByUser) {
        const { user, tasks } = tasksByUser[uid];

        await Notification.create({
          userId: uid,
          type: 'task_overdue',
          title: 'Overdue Tasks',
          message: `You have ${tasks.length} overdue task${tasks.length > 1 ? 's' : ''} that need attention`,
          actionUrl: '/tasks?filter=overdue'
        });

        // Mark tasks as notified
        await Task.updateMany(
          { _id: { $in: tasks.map(t => t._id) } },
          { overdueNotified: true }
        );
      }

      console.log(`Daily overdue scan completed: ${overdueTasks.length} tasks found`);
    } catch (error) {
      console.error('Error in daily overdue scan:', error);
    }
  });

  // Job 3: Daily summary email
  agenda.define('daily-summary', async (job) => {
    const Task = require('../models/Task');
    const User = require('../models/User');
    const emailService = require('../services/emailService');

    try {
      const users = await User.find({
        'settings.notifications.dailySummary': true,
        isActive: true
      });

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      for (const user of users) {
        // Get today's task count
        const todayTasks = await Task.countDocuments({
          userId: user._id,
          dueDate: { $gte: todayStart, $lte: todayEnd },
          status: 'pending'
        });

        // Get overdue task count
        const overdueTasks = await Task.countDocuments({
          userId: user._id,
          dueDate: { $lt: todayStart },
          status: 'pending'
        });

        if (todayTasks > 0 || overdueTasks > 0) {
          await emailService.sendDailySummary(user, { todayTasks, overdueTasks });
        }
      }

      console.log('Daily summary emails sent');
    } catch (error) {
      console.error('Error sending daily summary:', error);
    }
  });

  // Job 4: AI recovery scan
  agenda.define('ai-recovery-scan', async (job) => {
    const Lead = require('../models/Lead');
    const Notification = require('../models/Notification');
    const User = require('../models/User');

    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const users = await User.find({ isActive: true });

      for (const user of users) {
        // Find cold leads
        const coldLeads = await Lead.countDocuments({
          userId: user._id,
          isDeleted: false,
          status: { $nin: ['won', 'lost'] },
          lastContactedAt: { $lt: sevenDaysAgo }
        });

        // Find stuck leads
        const stuckLeads = await Lead.countDocuments({
          userId: user._id,
          isDeleted: false,
          status: { $in: ['contacted', 'qualified'] },
          updatedAt: { $lt: fourteenDaysAgo }
        });

        const totalRecovery = coldLeads + stuckLeads;

        if (totalRecovery > 0) {
          await Notification.create({
            userId: user._id,
            type: 'ai_recovery',
            title: 'Leads Need Attention',
            message: `${totalRecovery} lead${totalRecovery > 1 ? 's' : ''} may need your attention. Check AI Recovery for suggestions.`,
            actionUrl: '/ai-recovery'
          });
        }
      }

      console.log('AI recovery scan completed');
    } catch (error) {
      console.error('Error in AI recovery scan:', error);
    }
  });

  // Job 5: Weekly report
  agenda.define('weekly-report', async (job) => {
    const Lead = require('../models/Lead');
    const Task = require('../models/Task');
    const User = require('../models/User');
    const emailService = require('../services/emailService');

    try {
      const users = await User.find({
        'settings.notifications.weeklyReport': true,
        isActive: true
      });

      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);

      for (const user of users) {
        // Calculate weekly stats
        const leadsAdded = await Lead.countDocuments({
          userId: user._id,
          createdAt: { $gte: weekStart }
        });

        const tasksCompleted = await Task.countDocuments({
          userId: user._id,
          completedAt: { $gte: weekStart }
        });

        const dealsWon = await Lead.countDocuments({
          userId: user._id,
          status: 'won',
          wonAt: { $gte: weekStart }
        });

        const stats = { leadsAdded, tasksCompleted, dealsWon };
        await emailService.sendWeeklyReport(user, stats);
      }

      console.log('Weekly reports sent');
    } catch (error) {
      console.error('Error sending weekly reports:', error);
    }
  });
};

const startAgenda = async () => {
  if (!agenda) {
    initAgenda();
  }

  await agenda.start();

  // Schedule recurring jobs
  await agenda.every('0 8 * * *', 'daily-overdue-scan', {}, { timezone: 'Asia/Kolkata' });
  await agenda.every('0 8 * * *', 'daily-summary', {}, { timezone: 'Asia/Kolkata' });
  await agenda.every('0 9 * * *', 'ai-recovery-scan', {}, { timezone: 'Asia/Kolkata' });
  await agenda.every('0 8 * * 1', 'weekly-report', {}, { timezone: 'Asia/Kolkata' });

  console.log('Agenda jobs scheduled');
};

const getAgenda = () => {
  if (!agenda) {
    initAgenda();
  }
  return agenda;
};

const scheduleReminder = async (taskId, userId, leadId, reminderAt) => {
  const agendaInstance = getAgenda();
  const job = await agendaInstance.schedule(reminderAt, 'send-task-reminder', {
    taskId,
    userId,
    leadId
  });
  return job.attrs._id;
};

const cancelReminder = async (jobId) => {
  if (!jobId) return;
  const agendaInstance = getAgenda();
  await agendaInstance.cancel({ _id: jobId });
};

module.exports = {
  initAgenda,
  startAgenda,
  getAgenda,
  scheduleReminder,
  cancelReminder
};
