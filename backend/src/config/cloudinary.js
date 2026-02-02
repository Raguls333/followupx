const cloudinary = require('cloudinary').v2;

const requiredEnv = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];

const isMissing = (value) =>
  value === undefined ||
  value === null ||
  value === '' ||
  value.toLowerCase?.() === 'undefined' ||
  value.toLowerCase?.() === 'null';

// Validate required Cloudinary environment variables early
const missing = requiredEnv.filter((key) => isMissing(process.env[key]));
if (missing.length) {
  // Throwing here prevents the app from starting with a broken upload setup
  throw new Error(
    `Missing Cloudinary environment variables: ${missing.join(', ')}`
  );
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const CLOUDINARY_UPLOAD_FOLDER =
  process.env.CLOUDINARY_UPLOAD_FOLDER || 'followupx';

module.exports = {
  cloudinary,
  CLOUDINARY_UPLOAD_FOLDER
};
