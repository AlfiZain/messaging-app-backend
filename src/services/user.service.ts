import * as userRepository from '../repositories/user.repository.js';
import type { UpdateProfileInput } from '../schemas/user.schema.js';
import { ApiError } from '../utils/api-error.js';

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
