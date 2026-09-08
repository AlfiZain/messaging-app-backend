import bcyrpt from 'bcrypt';

import type { LoginInput, RegisterInput } from '../schemas/auth.schema.js';
import * as userRepository from '../repositories/user.repository.js';
import { ApiError } from '../utils/api-error.js';
import { generateAccessToken } from '../lib/jwt.js';

export async function register(registerInput: RegisterInput) {
  const { username, email, password } = registerInput;

  const existingUser = await userRepository.findUserByUsernameOrEmail(
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

export async function login(loginInput: LoginInput) {
  const { identifier, password } = loginInput;
  const user = await userRepository.findUserByUsernameOrEmail(
    identifier,
    identifier,
  );

  if (!user) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const isPasswordValid = await bcyrpt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const token = generateAccessToken(user.id);
  const { password: _, ...userWithoutPassword } = user;

  return {
    token,
    user: userWithoutPassword,
  };
}
