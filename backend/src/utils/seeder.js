/**
 * Database Seeder
 * Seeds initial data for development/testing
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Import models
const User = require('../models/User');
const Lead = require('../models/Lead');
const Task = require('../models/Task');
const Activity = require('../models/Activity');
const Template = require('../models/Template');
const Notification = require('../models/Notification');

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

// Sample data
const sampleLeads = [
  {
    name: { first: 'Rahul', last: 'Sharma' },
    phone: '+919876543210',
    email: 'rahul.sharma@example.com',
    company: 'TechCorp India',
    status: 'contacted',
    source: 'referral',
    priority: 'high',
    estimatedValue: 5000000,
    tags: ['premium', 'residential']
  },
  {
    name: { first: 'Priya', last: 'Patel' },
    phone: '+919876543211',
    email: 'priya.patel@example.com',
    company: 'StartUp Solutions',
    status: 'qualified',
    source: 'website',
    priority: 'medium',
    estimatedValue: 2500000,
    tags: ['first-time-buyer']
  },
  {
    name: { first: 'Amit', last: 'Kumar' },
    phone: '+919876543212',
    email: 'amit.kumar@example.com',
    company: 'Global Enterprises',
    status: 'new',
    source: 'cold_call',
    priority: 'medium',
    estimatedValue: 1500000,
    tags: ['investor']
  },
  {
    name: { first: 'Sneha', last: 'Gupta' },
    phone: '+919876543213',
    email: 'sneha.gupta@example.com',
    status: 'proposal',
    source: 'advertisement',
    priority: 'urgent',
    estimatedValue: 8000000,
    tags: ['premium', 'villa']
  },
  {
    name: { first: 'Vikram', last: 'Singh' },
    phone: '+919876543214',
    email: 'vikram.singh@example.com',
    company: 'Singh Industries',
    status: 'contacted',
    source: 'walk_in',
    priority: 'low',
    estimatedValue: 1000000,
    tags: ['budget']
  }
];

// Seed functions
const seedTemplates = async () => {
  console.log('Seeding templates...');
  await Template.seedSystemTemplates();
  console.log('Templates seeded');
};

const seedDemoUser = async () => {
  console.log('Creating demo user...');

  // Check if demo user exists
  let user = await User.findOne({ email: 'demo@followupx.com' });

  if (!user) {
    user = await User.create({
      name: 'Demo User',
      email: 'demo@followupx.com',
      password: 'demo123456',
      phone: '+919999999999',
      company: 'FollowUpX Demo',
      industry: 'real_estate',
      plan: 'pro',
      isEmailVerified: true
    });
    console.log('Demo user created');
  } else {
    console.log('Demo user already exists');
  }

  return user;
};

const seedLeads = async (userId) => {
  console.log('Seeding leads...');

  // Check if leads exist for user
  const existingLeads = await Lead.countDocuments({ userId });
  if (existingLeads > 0) {
    console.log(`User already has ${existingLeads} leads, skipping...`);
    return await Lead.find({ userId }).lean();
  }

  const leads = await Lead.insertMany(
    sampleLeads.map(lead => ({
      ...lead,
      userId
    }))
  );

  console.log(`${leads.length} leads created`);
  return leads;
};

const seedTasks = async (userId, leads) => {
  console.log('Seeding tasks...');

  // Check if tasks exist
  const existingTasks = await Task.countDocuments({ userId });
  if (existingTasks > 0) {
    console.log(`User already has ${existingTasks} tasks, skipping...`);
    return;
  }

  const now = new Date();
  const tasks = [];

  // Create tasks for each lead
  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];

    // Add a task due today
    if (i < 2) {
      tasks.push({
        userId,
        leadId: lead._id,
        title: `Follow up call with ${lead.name.first}`,
        type: 'call',
        priority: lead.priority,
        dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10 + i, 0),
        status: 'pending'
      });
    }

    // Add a task due tomorrow
    if (i < 3) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tasks.push({
        userId,
        leadId: lead._id,
        title: `Send proposal to ${lead.name.first}`,
        type: 'email',
        priority: 'medium',
        dueDate: tomorrow,
        status: 'pending'
      });
    }

    // Add an overdue task
    if (i === 0) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      tasks.push({
        userId,
        leadId: lead._id,
        title: `Send WhatsApp message to ${lead.name.first}`,
        type: 'whatsapp',
        priority: 'high',
        dueDate: yesterday,
        status: 'pending'
      });
    }
  }

  await Task.insertMany(tasks);
  console.log(`${tasks.length} tasks created`);
};

const seedActivities = async (userId, leads) => {
  console.log('Seeding activities...');

  // Check if activities exist
  const existingActivities = await Activity.countDocuments({ userId });
  if (existingActivities > 0) {
    console.log(`User already has ${existingActivities} activities, skipping...`);
    return;
  }

  const activities = [];
  const now = new Date();

  for (const lead of leads) {
    // Lead created activity
    activities.push({
      userId,
      leadId: lead._id,
      type: 'lead_created',
      title: 'Lead created',
      description: `New lead ${lead.name.first} ${lead.name.last || ''} was added`,
      timestamp: lead.createdAt
    });

    // Random past activities
    const daysAgo = Math.floor(Math.random() * 14) + 1;
    const activityDate = new Date(now);
    activityDate.setDate(activityDate.getDate() - daysAgo);

    activities.push({
      userId,
      leadId: lead._id,
      type: 'whatsapp_sent',
      title: 'WhatsApp message sent',
      description: 'Sent initial introduction message',
      timestamp: activityDate
    });

    if (lead.status !== 'new') {
      const statusDate = new Date(activityDate);
      statusDate.setDate(statusDate.getDate() + 1);
      activities.push({
        userId,
        leadId: lead._id,
        type: 'status_changed',
        title: `Status changed to ${lead.status}`,
        description: `Lead moved from new to ${lead.status}`,
        timestamp: statusDate
      });
    }
  }

  await Activity.insertMany(activities);
  console.log(`${activities.length} activities created`);
};

const seedNotifications = async (userId) => {
  console.log('Seeding notifications...');

  // Check if notifications exist
  const existingNotifications = await Notification.countDocuments({ userId });
  if (existingNotifications > 0) {
    console.log(`User already has ${existingNotifications} notifications, skipping...`);
    return;
  }

  const notifications = [
    {
      userId,
      type: 'welcome',
      title: 'Welcome to FollowUpX!',
      message: 'Get started by adding your first lead and scheduling a follow-up task.',
      actionUrl: '/leads/new',
      read: false
    },
    {
      userId,
      type: 'task_overdue',
      title: 'Overdue Task',
      message: 'You have 1 overdue task that needs attention',
      actionUrl: '/tasks?filter=overdue',
      read: false
    },
    {
      userId,
      type: 'ai_recovery',
      title: 'Leads Need Attention',
      message: '2 leads may need your attention. Check AI Recovery for suggestions.',
      actionUrl: '/ai-recovery',
      read: false
    }
  ];

  await Notification.insertMany(notifications);
  console.log(`${notifications.length} notifications created`);
};

// Main seeder function
const seed = async () => {
  try {
    await connectDB();

    console.log('\n--- Starting Seed Process ---\n');

    // Seed templates (for all users)
    await seedTemplates();

    // Create demo user and seed their data
    const user = await seedDemoUser();
    const leads = await seedLeads(user._id);
    await seedTasks(user._id, leads);
    await seedActivities(user._id, leads);
    await seedNotifications(user._id);

    console.log('\n--- Seed Process Complete ---\n');
    console.log('Demo credentials:');
    console.log('Email: demo@followupx.com');
    console.log('Password: demo123456');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

// Delete all data (use with caution!)
const destroy = async () => {
  try {
    await connectDB();

    console.log('\n--- Destroying All Data ---\n');

    await User.deleteMany({});
    await Lead.deleteMany({});
    await Task.deleteMany({});
    await Activity.deleteMany({});
    await Template.deleteMany({});
    await Notification.deleteMany({});

    console.log('All data deleted');
    process.exit(0);
  } catch (error) {
    console.error('Destroy error:', error);
    process.exit(1);
  }
};

// Run based on argument
if (process.argv[2] === '-d' || process.argv[2] === '--destroy') {
  destroy();
} else {
  seed();
}
