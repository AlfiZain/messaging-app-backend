import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import { env } from '../configs/env.js';
import { ApiError } from '../utils/api-error.js';

cloudinary.config({
  cloud_name: env.cloudinary.cloudName,
  api_key: env.cloudinary.apiKey,
  api_secret: env.cloudinary.apiSecret,
});

export function uploadImageToCloudinary(
  buffer: Buffer,
  options?: {
    folder?: string;
    publicId?: string;
    overwrite?: boolean;
  },
): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options?.folder,
        public_id: options?.publicId,
        overwrite: options?.overwrite,
        resource_type: 'image',
      },
      (error, result) => {
        if (error) {
          reject(new ApiError(502, 'Cloudinary upload failed'));
          return;
        }

        if (!result) {
          reject(new ApiError(502, 'Cloudinary upload failed'));
          return;
        }

        resolve(result);
      },
    );

    uploadStream.end(buffer);
  });
}

export { cloudinary };
