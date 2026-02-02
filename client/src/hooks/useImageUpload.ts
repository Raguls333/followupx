import { useCallback, useState } from 'react';
import { uploadService, UploadedImage } from '../services';

/**
 * Small helper hook for uploading images via Cloudinary-backed endpoint.
 */
export function useImageUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null);

  const upload = useCallback(async (file: File): Promise<UploadedImage> => {
    setIsUploading(true);
    setError(null);
    try {
      const image = await uploadService.uploadImage(file);
      setUploadedImage(image);
      return image;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to upload image';
      setError(message);
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, []);

  return {
    upload,
    isUploading,
    error,
    uploadedImage
  };
}

export default useImageUpload;
