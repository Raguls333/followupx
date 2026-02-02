/**
 * Upload Service
 * Handles media uploads to the backend (Cloudinary under the hood)
 */

import api from './api';

export interface UploadedImage {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
  resourceType?: string;
}

export const uploadService = {
  /**
   * Upload a single image file.
   * Expects the backend /api/uploads/image endpoint.
   */
  uploadImage: async (file: File): Promise<UploadedImage> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.upload<{ success: boolean; data: UploadedImage }>(
      '/uploads/image',
      formData
    );

    return response.data;
  },

  /**
   * Delete an uploaded image by Cloudinary publicId.
   */
  deleteImage: async (publicId: string): Promise<void> => {
    await api.post('/uploads/delete', { publicId });
  },
};

export default uploadService;
