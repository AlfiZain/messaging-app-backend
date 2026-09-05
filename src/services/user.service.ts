import bcrypt from 'bcrypt';

import * as userRepository from '../repositories/user.repository.js';
import type {
  ChangePasswordInput,
  UpdateProfileInput,
} from '../schemas/user.schema.js';
import { ApiError } from '../utils/api-error.js';
import { uploadImageToCloudinary } from '../lib/cloudinary.js';

export async function getUserProfile(userId: string) {
  const user = await userRepository.findUserById(userId);

  if (!user) {
    throw new ApiError(401, 'Invalid token');
  }

  const { password: _, ...userWithoutPassword } = user;

  return userWithoutPassword;
}

export async function updateUserProfile(
  userId: string,
  userInput: UpdateProfileInput,
) {
  const user = await userRepository.findUserById(userId);

  if (!user) {
    throw new ApiError(401, 'Invalid token');
  }

  return userRepository.updateUserProfile(userId, userInput);
}

export async function changeUserPassword(
  userId: string,
  userInput: ChangePasswordInput,
) {
  const user = await userRepository.findUserById(userId);

  if (!user) {
    throw new ApiError(401, 'Invalid token');
  }

  const isPasswordValid = await bcrypt.compare(
    userInput.currentPassword,
    user.password,
  );

  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const hashedNewPassword = await bcrypt.hash(userInput.newPassword, 10);

  return userRepository.changeUserPassword(userId, hashedNewPassword);
}

export async function updateUserAvatar(
  userId: string,
  file: Express.Multer.File | undefined,
) {
  const user = await userRepository.findUserById(userId);

  if (!user) {
    throw new ApiError(401, 'Invalid token');
  }

  if (!file) {
    throw new ApiError(400, 'Avatar image is required');
  }

  const uploadedImage = await uploadImageToCloudinary(file.buffer, {
    folder: 'messaging-app/avatars',
    publicId: userId,
    overwrite: true,
  });

  return userRepository.updateUserProfile(userId, {
    avatarUrl: uploadedImage.secure_url,
  });
}
