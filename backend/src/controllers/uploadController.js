const { cloudinary, CLOUDINARY_UPLOAD_FOLDER } = require('../config/cloudinary');
const { AppError } = require('../middleware/errorHandler');

// Helper: promisify Cloudinary upload_stream for buffers
const uploadBufferToCloudinary = (buffer, options = {}) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) {
        return reject(error);
      }
      return resolve(result);
    });

    stream.end(buffer);
  });

// @desc    Upload a single image to Cloudinary
// @route   POST /api/uploads/image
// @access  Private
const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('No file provided', 400, 'NO_FILE');
    }

    const options = {
      folder: CLOUDINARY_UPLOAD_FOLDER,
      resource_type: 'image',
      transformation: [
        { width: 2000, height: 2000, crop: 'limit' }, // hard cap on size
        { quality: 'auto:good', fetch_format: 'auto' }
      ],
      context: {
        uploaded_by: req.user?._id?.toString() || 'anonymous'
      }
    };

    const result = await uploadBufferToCloudinary(req.file.buffer, options);

    res.status(201).json({
      success: true,
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
        resourceType: result.resource_type
      }
    });
  } catch (error) {
    // Normalize Cloudinary errors into AppError shape for the error handler
    if (error.http_code) {
      return next(
        new AppError(
          error.message || 'Cloudinary upload failed',
          error.http_code,
          'CLOUDINARY_ERROR'
        )
      );
    }
    return next(error);
  }
};

// @desc    Delete an uploaded asset from Cloudinary
// @route   POST /api/uploads/delete
// @access  Private
const deleteImage = async (req, res, next) => {
  try {
    const { publicId } = req.body;
    if (!publicId) {
      throw new AppError('publicId is required', 400, 'MISSING_PUBLIC_ID');
    }

    const result = await cloudinary.uploader.destroy(publicId, {
      invalidate: true
    });

    if (result.result !== 'ok' && result.result !== 'not found') {
      throw new AppError('Failed to delete image', 500, 'CLOUDINARY_DELETE_FAILED');
    }

    res.json({
      success: true,
      data: { deleted: result.result === 'ok', publicId }
    });
  } catch (error) {
    if (error.http_code) {
      return next(
        new AppError(
          error.message || 'Cloudinary delete failed',
          error.http_code,
          'CLOUDINARY_ERROR'
        )
      );
    }
    return next(error);
  }
};

module.exports = {
  uploadImage,
  deleteImage
};
