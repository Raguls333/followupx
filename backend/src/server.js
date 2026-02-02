const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Import configurations
const connectDB = require('./config/database');
const { startAgenda } = require('./config/agenda');

// Import routes
const authRoutes = require('./routes/auth');
const leadRoutes = require('./routes/leads');
const taskRoutes = require('./routes/tasks');
const activityRoutes = require('./routes/activities');
const whatsappRoutes = require('./routes/whatsapp');
const analyticsRoutes = require('./routes/analytics');
const notificationRoutes = require('./routes/notifications');
const teamRoutes = require('./routes/team');
const uploadRoutes = require('./routes/uploads');
const scheduledMessageRoutes = require('./routes/scheduledMessages');
const templateRoutes = require('./routes/templates');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');

// Initialize express app
const app = express();

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS configuration
// In production, we prefer an allowlist; to unblock current CORS failures we mirror any origin.
// If you want to restrict later, set FRONTEND_URL to a comma-separated list and switch origin: allowedOrigins.includes...
const rawOrigins = process.env.FRONTEND_URL || '';
const allowedOrigins = rawOrigins
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const corsOptions = {
  origin: allowedOrigins.length > 0 ? allowedOrigins : true, // reflect request origin
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Request logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting
app.use('/api', generalLimiter);

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'FollowUpX API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/scheduled-messages', scheduledMessageRoutes);
app.use('/api/templates', templateRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found',
      code: 'NOT_FOUND'
    }
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
let server;

const startServer = async () => {
  try {
    // Ensure DB is connected before starting the HTTP server or Agenda
    await connectDB();

    server = app.listen(PORT, async () => {
      console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);

      try {
        await startAgenda();
        console.log('Agenda scheduler started');
      } catch (error) {
        console.error('Failed to start Agenda:', error.message);
      }
    });
  } catch (error) {
    console.error('Failed to start server:', {
      message: error?.message,
      stack: error?.stack
    });
    process.exit(1);
  }
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', {
    message: err?.message,
    stack: err?.stack,
    name: err?.name
  });
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', {
    message: err?.message,
    stack: err?.stack,
    name: err?.name
  });
  process.exit(1);
});

module.exports = app;
