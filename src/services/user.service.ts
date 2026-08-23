import * as userRepository from '../repositories/user.repository.js';
import { ApiError } from '../utils/api-error.js';

export async function getUserProfile(userId: string) {
  const user = await userRepository.findUserById(userId);

  if (!user) {
    throw new ApiError(401, 'Invalid token');
  }

  const { password: _, ...userWithoutPassword } = user;

  return userWithoutPassword;
}
