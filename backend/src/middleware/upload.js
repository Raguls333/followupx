const multer = require('multer');
const path = require('path');

const MAX_FILE_SIZE =
  parseInt(process.env.MAX_FILE_SIZE || `${5 * 1024 * 1024}`, 10);

// Accept common web image mime types only
const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/heic',
  'image/heif'
]);

const imageFileFilter = (req, file, cb) => {
  if (allowedMimeTypes.has(file.mimetype)) {
    return cb(null, true);
  }
  const err = new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname);
  err.message = 'Invalid file type. Only image uploads are allowed.';
  cb(err);
};

// Memory storage so we can stream directly to Cloudinary
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: imageFileFilter
});

module.exports = {
  imageUpload
};
