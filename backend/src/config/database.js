const mongoose = require('mongoose');
const dotenv = require('dotenv');


dotenv.config();

const connectDB = async () => {
  try {
    // Support both MONGODB_URI and MONGO_URI (some envs may set either)
    const rawUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (
      !rawUri ||
      rawUri.toLowerCase?.() === 'undefined' ||
      rawUri.toLowerCase?.() === 'null'
    ) {
      throw new Error(
        'MONGODB_URI is missing or invalid (got undefined/null). Check your environment variables.'
      );
    }

    // Extra guard: ensure host portion is not "undefined"
    const hostPart = (() => {
      try {
        const afterAt = rawUri.split('@')[1] || '';
        return afterAt.split('/')[0];
      } catch {
        return '';
      }
    })();

    if (!hostPart || hostPart.toLowerCase() === 'undefined') {
      throw new Error(
        `MONGODB_URI host is invalid ("${hostPart || 'empty'}"). Please set a full Mongo connection string.`
      );
    }

    const conn = await mongoose.connect(rawUri, {
      // Mongoose 8 no longer requires these options, but keeping for compatibility
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });

    return conn;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
