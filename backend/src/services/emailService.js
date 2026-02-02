const nodemailer = require('nodemailer');

/**
 * FollowUpX Email Service
 * Brand Colors:
 * - Primary: #10b981 (Emerald-600)
 * - Primary Dark: #059669 (Emerald-700)
 * - Primary Light: #ecfdf5 (Emerald-50)
 * - Border: #d1fae5 (Emerald-200)
 * - Text: #030213 (Slate-900)
 * - Muted: #717182
 * - Background: #ffffff
 * - Error: #ef4444
 */

// Brand color constants
const COLORS = {
  primary: '#10b981',
  primaryDark: '#059669',
  primaryLight: '#ecfdf5',
  primaryBorder: '#d1fae5',
  text: '#030213',
  textMuted: '#717182',
  background: '#ffffff',
  cardBg: '#f8fafc',
  error: '#ef4444',
  errorLight: '#fef2f2',
  warning: '#f59e0b',
  warningLight: '#fffbeb'
};

// Base email styles - responsive
const getBaseStyles = () => `
  <style>
    /* Reset */
    body, table, td, p, a, li { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }

    /* Base */
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: ${COLORS.text};
      background-color: #f1f5f9;
      margin: 0;
      padding: 0;
      width: 100% !important;
    }

    /* Container */
    .email-wrapper {
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
      background-color: ${COLORS.background};
    }

    /* Header */
    .header {
      background: linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%);
      color: white;
      padding: 32px 24px;
      text-align: center;
    }
    .header h1, .header h2 {
      margin: 0;
      font-weight: 700;
      color: white;
    }
    .header p {
      margin: 8px 0 0 0;
      opacity: 0.9;
      font-size: 14px;
    }

    /* Logo */
    .logo {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin-bottom: 8px;
    }
    .logo-x {
      color: #a7f3d0;
    }

    /* Content */
    .content {
      padding: 32px 24px;
      background-color: ${COLORS.background};
    }
    .content p {
      margin: 0 0 16px 0;
      color: ${COLORS.text};
    }

    /* Cards */
    .card {
      background: ${COLORS.cardBg};
      border: 1px solid ${COLORS.primaryBorder};
      border-radius: 12px;
      padding: 20px;
      margin: 20px 0;
    }
    .card-accent {
      border-left: 4px solid ${COLORS.primary};
    }

    /* Stats */
    .stats-grid {
      text-align: center;
      margin: 24px 0;
    }
    .stat-card {
      display: inline-block;
      background: ${COLORS.background};
      border: 1px solid ${COLORS.primaryBorder};
      border-radius: 12px;
      padding: 16px 24px;
      margin: 8px;
      min-width: 100px;
      vertical-align: top;
    }
    .stat-number {
      font-size: 36px;
      font-weight: 800;
      color: ${COLORS.primary};
      line-height: 1;
      margin-bottom: 4px;
    }
    .stat-label {
      font-size: 13px;
      color: ${COLORS.textMuted};
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Steps */
    .steps {
      background: ${COLORS.primaryLight};
      border-radius: 12px;
      padding: 20px;
      margin: 24px 0;
    }
    .steps h3 {
      margin: 0 0 16px 0;
      color: ${COLORS.primaryDark};
      font-size: 16px;
    }
    .step {
      display: flex;
      align-items: flex-start;
      margin: 12px 0;
    }
    .step-number {
      background: ${COLORS.primary};
      color: white;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
      margin-right: 12px;
      flex-shrink: 0;
    }
    .step-text {
      color: ${COLORS.text};
      padding-top: 4px;
    }

    /* Buttons */
    .button {
      display: inline-block;
      background: ${COLORS.primary};
      color: white !important;
      padding: 14px 32px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 15px;
      text-align: center;
      transition: background 0.2s;
    }
    .button:hover {
      background: ${COLORS.primaryDark};
    }
    .button-wrapper {
      text-align: center;
      margin: 24px 0;
    }

    /* Alerts */
    .alert {
      padding: 16px;
      border-radius: 8px;
      margin: 16px 0;
    }
    .alert-warning {
      background: ${COLORS.warningLight};
      border-left: 4px solid ${COLORS.warning};
    }
    .alert-error {
      background: ${COLORS.errorLight};
      border-left: 4px solid ${COLORS.error};
    }

    /* Footer */
    .footer {
      background: ${COLORS.cardBg};
      padding: 24px;
      text-align: center;
      border-top: 1px solid ${COLORS.primaryBorder};
    }
    .footer p {
      margin: 4px 0;
      color: ${COLORS.textMuted};
      font-size: 12px;
    }
    .footer-brand {
      font-weight: 600;
      color: ${COLORS.primary};
    }

    /* Task card */
    .task-card {
      background: ${COLORS.background};
      border: 1px solid ${COLORS.primaryBorder};
      border-left: 4px solid ${COLORS.primary};
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .task-card h3 {
      margin: 0 0 12px 0;
      color: ${COLORS.text};
      font-size: 18px;
    }
    .task-meta {
      color: ${COLORS.textMuted};
      font-size: 14px;
      line-height: 1.8;
    }
    .task-meta strong {
      color: ${COLORS.text};
    }

    /* Invite card */
    .invite-card {
      background: ${COLORS.primaryLight};
      border: 2px solid ${COLORS.primaryBorder};
      border-radius: 16px;
      padding: 32px;
      margin: 24px 0;
      text-align: center;
    }
    .invite-card h2 {
      color: ${COLORS.primary};
      margin: 8px 0;
      font-size: 24px;
    }
    .invite-role {
      display: inline-block;
      background: ${COLORS.primary};
      color: white;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Responsive */
    @media only screen and (max-width: 600px) {
      .email-wrapper {
        width: 100% !important;
      }
      .content, .header, .footer {
        padding: 20px 16px !important;
      }
      .stat-card {
        display: block !important;
        margin: 8px 0 !important;
      }
      .stats-grid {
        text-align: left !important;
      }
    }
  </style>
`;

// Email template wrapper
const wrapEmail = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>FollowUpX</title>
  ${getBaseStyles()}
</head>
<body>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9;">
    <tr>
      <td align="center" style="padding: 24px 12px;">
        <table role="presentation" class="email-wrapper" cellspacing="0" cellpadding="0" style="border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          ${content}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// Footer component
const getFooter = (email) => `
<tr>
  <td class="footer">
    <p class="footer-brand">FollowUp<span style="color: ${COLORS.primaryDark};">X</span></p>
    <p>Never Miss a Follow-Up</p>
    <p style="margin-top: 12px;">This email was sent to ${email}</p>
  </td>
</tr>
`;

// Create transporter with sane fallbacks
const createTransporter = () => {
  const rawHost = process.env.EMAIL_HOST;
  const host =
    !rawHost || rawHost.toLowerCase() === 'undefined'
      ? 'smtp.gmail.com'
      : rawHost;

  const rawPort = process.env.EMAIL_PORT;
  const port = Number(rawPort) || 587;
  const secure = rawPort === '465';

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn(
      '[email] EMAIL_USER or EMAIL_PASS missing. Emails will not be sent.'
    );
    return nodemailer.createTransport({
      jsonTransport: true
    });
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

/**
 * Send email helper
 */
const sendEmail = async (to, subject, html, text = '') => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'FollowUpX <noreply@followupx.com>',
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, '')
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Email send error:', error.message);
    throw error;
  }
};

/**
 * Send welcome email to new user
 */
const sendWelcomeEmail = async (user) => {
  const subject = 'Welcome to FollowUpX! 🎉';

  const content = `
    <tr>
      <td class="header">
        <div class="logo">FollowUp<span class="logo-x">X</span></div>
        <h1>Welcome aboard! 🚀</h1>
        <p>Your journey to better lead management starts now</p>
      </td>
    </tr>
    <tr>
      <td class="content">
        <p>Hi <strong>${user.name}</strong>,</p>
        <p>Thank you for joining FollowUpX! We're excited to help you manage your leads and never miss a follow-up again.</p>

        <div class="steps">
          <h3>🎯 Get Started in 3 Easy Steps</h3>
          <div class="step">
            <span class="step-number">1</span>
            <span class="step-text">Add your first lead with their contact details</span>
          </div>
          <div class="step">
            <span class="step-number">2</span>
            <span class="step-text">Schedule a follow-up task with reminders</span>
          </div>
          <div class="step">
            <span class="step-number">3</span>
            <span class="step-text">Send a WhatsApp message with one click</span>
          </div>
        </div>

        <div class="button-wrapper">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" class="button">Go to Dashboard →</a>
        </div>

        <p>Need help getting started? Just reply to this email and we'll be happy to assist!</p>

        <p>Happy selling! 💪<br><strong>The FollowUpX Team</strong></p>
      </td>
    </tr>
    ${getFooter(user.email)}
  `;

  return sendEmail(user.email, subject, wrapEmail(content));
};

/**
 * Send task reminder email
 */
const sendTaskReminder = async (user, task) => {
  const subject = `⏰ Reminder: ${task.title}`;
  const leadName = task.leadId?.name?.first || 'Unknown';
  const dueDate = new Date(task.dueDate).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata'
  });

  const content = `
    <tr>
      <td class="header">
        <div class="logo">FollowUp<span class="logo-x">X</span></div>
        <h2>⏰ Task Reminder</h2>
        <p>Don't forget your upcoming task</p>
      </td>
    </tr>
    <tr>
      <td class="content">
        <p>Hi <strong>${user.name}</strong>,</p>
        <p>This is a friendly reminder about your upcoming task:</p>

        <div class="task-card">
          <h3>${task.title}</h3>
          <div class="task-meta">
            <strong>Type:</strong> ${task.type.charAt(0).toUpperCase() + task.type.slice(1)}<br>
            <strong>Lead:</strong> ${leadName}<br>
            <strong>Due:</strong> ${dueDate}
          </div>
          ${task.description ? `<p style="margin-top: 12px; color: ${COLORS.textMuted};">${task.description}</p>` : ''}
        </div>

        <div class="button-wrapper">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/tasks/${task._id}" class="button">View Task →</a>
        </div>

        <p style="color: ${COLORS.textMuted}; font-size: 14px;">
          Tip: Complete this task to keep your lead engaged and moving through your pipeline.
        </p>
      </td>
    </tr>
    ${getFooter(user.email)}
  `;

  return sendEmail(user.email, subject, wrapEmail(content));
};

/**
 * Send daily summary email
 */
const sendDailySummary = async (user, data) => {
  const { todayTasks, overdueTasks } = data;
  const subject = `📊 Daily Summary: ${todayTasks} task${todayTasks !== 1 ? 's' : ''} today`;
  const dateStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Kolkata'
  });

  const content = `
    <tr>
      <td class="header">
        <div class="logo">FollowUp<span class="logo-x">X</span></div>
        <h2>📊 Your Daily Summary</h2>
        <p>${dateStr}</p>
      </td>
    </tr>
    <tr>
      <td class="content">
        <p>Good morning, <strong>${user.name}</strong>! ☀️</p>
        <p>Here's what's on your plate for today:</p>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-number">${todayTasks}</div>
            <div class="stat-label">Today's Tasks</div>
          </div>
          ${overdueTasks > 0 ? `
          <div class="stat-card" style="border-color: ${COLORS.error};">
            <div class="stat-number" style="color: ${COLORS.error};">${overdueTasks}</div>
            <div class="stat-label">Overdue</div>
          </div>
          ` : ''}
        </div>

        ${overdueTasks > 0 ? `
        <div class="alert alert-warning">
          ⚠️ <strong>Heads up!</strong> You have ${overdueTasks} overdue task${overdueTasks !== 1 ? 's' : ''} that need your attention.
        </div>
        ` : `
        <div class="card" style="background: ${COLORS.primaryLight}; text-align: center;">
          <p style="margin: 0; color: ${COLORS.primaryDark};">✨ You're all caught up! Great job staying on top of things.</p>
        </div>
        `}

        <div class="button-wrapper">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" class="button">View Dashboard →</a>
        </div>

        <p>Have a productive day! 🚀</p>
      </td>
    </tr>
    ${getFooter(user.email)}
  `;

  return sendEmail(user.email, subject, wrapEmail(content));
};

/**
 * Send weekly report email
 */
const sendWeeklyReport = async (user, stats) => {
  const { leadsAdded, tasksCompleted, dealsWon } = stats;
  const subject = dealsWon > 0
    ? `🏆 Weekly Report: ${dealsWon} deal${dealsWon !== 1 ? 's' : ''} won!`
    : `📈 Your Weekly Performance Report`;

  const content = `
    <tr>
      <td class="header">
        <div class="logo">FollowUp<span class="logo-x">X</span></div>
        <div style="font-size: 48px; margin: 8px 0;">🏆</div>
        <h2>Weekly Performance Report</h2>
        <p>Your achievements this week</p>
      </td>
    </tr>
    <tr>
      <td class="content">
        <p>Hi <strong>${user.name}</strong>,</p>
        <p>Here's a recap of your performance this week:</p>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-number">${leadsAdded}</div>
            <div class="stat-label">Leads Added</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${tasksCompleted}</div>
            <div class="stat-label">Tasks Done</div>
          </div>
          <div class="stat-card" style="border: 2px solid ${COLORS.primary}; background: ${COLORS.primaryLight};">
            <div class="stat-number" style="color: ${COLORS.primary};">${dealsWon}</div>
            <div class="stat-label">Deals Won</div>
          </div>
        </div>

        ${dealsWon > 0 ? `
        <div class="card" style="background: ${COLORS.primaryLight}; text-align: center; border: 2px solid ${COLORS.primaryBorder};">
          <p style="margin: 0; font-size: 18px; color: ${COLORS.primary}; font-weight: 600;">
            🎉 Congratulations on closing ${dealsWon} deal${dealsWon !== 1 ? 's' : ''}!
          </p>
          <p style="margin: 8px 0 0 0; color: ${COLORS.textMuted};">Keep up the amazing work!</p>
        </div>
        ` : `
        <div class="card" style="text-align: center;">
          <p style="margin: 0; color: ${COLORS.text};">
            💪 Every task completed brings you closer to your next win!
          </p>
        </div>
        `}

        <div class="button-wrapper">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/analytics" class="button">View Full Analytics →</a>
        </div>

        <p>Keep crushing it! 💪<br><strong>The FollowUpX Team</strong></p>
      </td>
    </tr>
    ${getFooter(user.email)}
  `;

  return sendEmail(user.email, subject, wrapEmail(content));
};

/**
 * Send team invitation email
 */
const sendTeamInvite = async (email, data) => {
  const { inviterName, teamName, inviteUrl, role } = data;
  const subject = `👋 ${inviterName} invited you to join ${teamName}`;

  const content = `
    <tr>
      <td class="header">
        <div class="logo">FollowUp<span class="logo-x">X</span></div>
        <h2>👋 You're Invited!</h2>
        <p>Join your team on FollowUpX</p>
      </td>
    </tr>
    <tr>
      <td class="content">
        <div class="invite-card">
          <p style="margin: 0; color: ${COLORS.textMuted}; font-size: 14px;"><strong>${inviterName}</strong> has invited you to join</p>
          <h2>${teamName}</h2>
          <p style="margin: 8px 0 16px 0;">as a</p>
          <span class="invite-role">${role}</span>

          <div class="button-wrapper" style="margin-top: 24px;">
            <a href="${inviteUrl}" class="button">Accept Invitation →</a>
          </div>

          <p style="margin: 16px 0 0 0; color: ${COLORS.textMuted}; font-size: 13px;">
            ⏰ This invitation expires in 7 days
          </p>
        </div>

        <div class="card">
          <p style="margin: 0; text-align: center;">
            <strong>What is FollowUpX?</strong><br>
            <span style="color: ${COLORS.textMuted};">
              FollowUpX helps sales teams manage leads, schedule follow-ups, and close more deals with WhatsApp integration and AI-powered recovery suggestions.
            </span>
          </p>
        </div>
      </td>
    </tr>
    ${getFooter(email)}
  `;

  return sendEmail(email, subject, wrapEmail(content));
};

/**
 * Send AI recovery alert email
 */
const sendRecoveryAlert = async (user, data) => {
  const { coldLeads, revenueAtRisk } = data;
  const subject = `🔔 ${coldLeads} leads need your attention`;
  const formattedRevenue = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(revenueAtRisk);

  const content = `
    <tr>
      <td class="header">
        <div class="logo">FollowUp<span class="logo-x">X</span></div>
        <h2>🔔 Leads Need Attention</h2>
        <p>AI Recovery Suggestions Available</p>
      </td>
    </tr>
    <tr>
      <td class="content">
        <p>Hi <strong>${user.name}</strong>,</p>
        <p>Our AI has identified some leads that may need your attention:</p>

        <div class="stats-grid">
          <div class="stat-card" style="border-color: ${COLORS.warning};">
            <div class="stat-number" style="color: ${COLORS.warning};">${coldLeads}</div>
            <div class="stat-label">Cold Leads</div>
          </div>
          <div class="stat-card">
            <div class="stat-number" style="font-size: 24px;">${formattedRevenue}</div>
            <div class="stat-label">At Risk</div>
          </div>
        </div>

        <div class="alert alert-warning">
          💡 <strong>Pro Tip:</strong> Leads that go cold for more than 7 days are 50% less likely to convert. A quick WhatsApp message can re-engage them!
        </div>

        <div class="button-wrapper">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/ai-recovery" class="button">View Recovery Suggestions →</a>
        </div>

        <p style="color: ${COLORS.textMuted}; font-size: 14px;">
          Our AI analyzes your lead activity patterns to suggest the best actions to take.
        </p>
      </td>
    </tr>
    ${getFooter(user.email)}
  `;

  return sendEmail(user.email, subject, wrapEmail(content));
};

/**
 * Send deal won celebration email
 */
const sendDealWonEmail = async (user, deal) => {
  const subject = `🎉 Congratulations! You closed a deal!`;
  const formattedValue = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(deal.value || deal.estimatedValue || 0);

  const content = `
    <tr>
      <td class="header" style="background: linear-gradient(135deg, ${COLORS.primary} 0%, #047857 100%);">
        <div style="font-size: 64px; margin-bottom: 8px;">🎉</div>
        <div class="logo">FollowUp<span class="logo-x">X</span></div>
        <h2>Deal Closed!</h2>
      </td>
    </tr>
    <tr>
      <td class="content" style="text-align: center;">
        <p>Congratulations, <strong>${user.name}</strong>! 🏆</p>

        <div class="card" style="background: ${COLORS.primaryLight}; border: 2px solid ${COLORS.primary};">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: ${COLORS.textMuted};">You just closed</p>
          <h2 style="margin: 0; color: ${COLORS.primary};">${deal.name?.first || 'a lead'} ${deal.name?.last || ''}</h2>
          ${deal.company ? `<p style="margin: 4px 0 0 0; color: ${COLORS.textMuted};">${deal.company}</p>` : ''}
          <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid ${COLORS.primaryBorder};">
            <p style="margin: 0; font-size: 32px; font-weight: 800; color: ${COLORS.primary};">${formattedValue}</p>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: ${COLORS.textMuted}; text-transform: uppercase; letter-spacing: 1px;">Deal Value</p>
          </div>
        </div>

        <p>Keep up the momentum! Every deal brings you closer to your goals.</p>

        <div class="button-wrapper">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/analytics" class="button">View Your Stats →</a>
        </div>
      </td>
    </tr>
    ${getFooter(user.email)}
  `;

  return sendEmail(user.email, subject, wrapEmail(content));
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendTaskReminder,
  sendDailySummary,
  sendWeeklyReport,
  sendTeamInvite,
  sendRecoveryAlert,
  sendDealWonEmail,
  COLORS
};
