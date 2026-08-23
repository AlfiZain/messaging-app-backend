import bcyrpt from 'bcrypt';

import type { RegisterInput } from '../schemas/auth.schema.js';
import * as userRepository from '../repositories/user.repository.js';
import { ApiError } from '../utils/api-error.js';
import { generateAccessToken } from '../lib/jwt.js';

export async function register(registerInput: RegisterInput) {
  const { username, email, password } = registerInput;

  const existingUser = await userRepository.findByUsernameOrEmail(
    username,
    email,
  );

  if (existingUser) {
    throw new ApiError(409, 'Username or email is already in use');
  }

  const hashedPassword = await bcyrpt.hash(password, 10);

  const user = await userRepository.createUser({
    ...registerInput,
    password: hashedPassword,
  });

  const token = generateAccessToken(user.id);

  return {
    token,
    user,
  };
}
