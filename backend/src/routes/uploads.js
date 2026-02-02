const express = require('express');
const router = express.Router();

const { uploadImage, deleteImage } = require('../controllers/uploadController');
const { authenticate } = require('../middleware/auth');
const { imageUpload } = require('../middleware/upload');

// All upload routes require authentication
router.use(authenticate);

// Single image upload
router.post('/image', imageUpload.single('file'), uploadImage);

// Delete by publicId
router.post('/delete', deleteImage);

module.exports = router;
