import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import { executeQuery } from '../database/connection';
import { User, LoginRequest, RegisterRequest, AuthResponse } from '../types';
import { asyncHandler, createValidationError, createUnauthorizedError } from '../middleware/errorHandler';
import { sendPasswordResetEmail } from '../utils/email';

const router = Router();

// Validation schemas
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  first_name: Joi.string().min(2).max(100).required(),
  last_name: Joi.string().min(2).max(100).required()
});

const resetPasswordSchema = Joi.object({
  email: Joi.string().email().required()
});

const newPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(6).required()
});

// Generate JWT token
const generateToken = (user: User): string => {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', asyncHandler(async (req, res) => {
  const { error, value } = registerSchema.validate(req.body);
  if (error) {
    throw createValidationError('validation', error.details[0].message);
  }

  const { email, password, first_name, last_name }: RegisterRequest = value;

  // Check if user already exists
  const existingUsers = await executeQuery<User[]>(
    'SELECT id FROM users WHERE email = ?',
    [email]
  );

  if (existingUsers.length > 0) {
    throw createValidationError('email', 'User with this email already exists');
  }

  // Hash password
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Create user
  const result = await executeQuery<any>(
    'INSERT INTO users (email, password, first_name, last_name, role) VALUES (?, ?, ?, ?, ?)',
    [email, hashedPassword, first_name, last_name, 'family_member']
  );

  // Get created user
  const users = await executeQuery<User[]>(
    'SELECT id, email, first_name, last_name, role, is_active, email_verified, created_at, updated_at FROM users WHERE id = ?',
    [result.insertId]
  );

  const user = users[0];
  const token = generateToken(user);

  const response: AuthResponse = {
    user,
    token
  };

  res.status(201).json(response);
}));

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', asyncHandler(async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    throw createValidationError('validation', error.details[0].message);
  }

  const { email, password }: LoginRequest = value;

  // Find user
  const users = await executeQuery<User[]>(
    'SELECT id, email, password, first_name, last_name, role, is_active, email_verified, created_at, updated_at FROM users WHERE email = ?',
    [email]
  );

  if (users.length === 0) {
    throw createUnauthorizedError('Invalid email or password');
  }

  const user = users[0];

  // Check if user is active
  if (!user.is_active) {
    throw createUnauthorizedError('Account is deactivated');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password!);
  if (!isPasswordValid) {
    throw createUnauthorizedError('Invalid email or password');
  }

  // Remove password from response
  const { password: _, ...userWithoutPassword } = user;

  const token = generateToken(userWithoutPassword);

  const response: AuthResponse = {
    user: userWithoutPassword,
    token
  };

  res.json(response);
}));

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password', asyncHandler(async (req, res) => {
  const { error, value } = resetPasswordSchema.validate(req.body);
  if (error) {
    throw createValidationError('validation', error.details[0].message);
  }

  const { email } = value;

  // Find user
  const users = await executeQuery<User[]>(
    'SELECT id, email, first_name, last_name FROM users WHERE email = ? AND is_active = TRUE',
    [email]
  );

  if (users.length === 0) {
    // Don't reveal if email exists or not for security
    res.json({ message: 'If an account with this email exists, a password reset link has been sent.' });
    return;
  }

  const user = users[0];

  // Generate reset token
  const resetToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: '1h' }
  );

  // Save reset token to database
  await executeQuery(
    'UPDATE users SET reset_token = ?, reset_token_expires = DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE id = ?',
    [resetToken, user.id]
  );

  // Send email
  try {
    await sendPasswordResetEmail(user.email, resetToken, user.first_name);
    res.json({ message: 'Password reset email sent successfully.' });
  } catch (emailError) {
    console.error('Email sending failed:', emailError);
    // Remove reset token if email fails
    await executeQuery(
      'UPDATE users SET reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [user.id]
    );
    throw createValidationError('email', 'Failed to send password reset email');
  }
}));

// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post('/reset-password', asyncHandler(async (req, res) => {
  const { error, value } = newPasswordSchema.validate(req.body);
  if (error) {
    throw createValidationError('validation', error.details[0].message);
  }

  const { token, password } = value;

  // Verify token
  let decoded: any;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
  } catch (jwtError) {
    throw createUnauthorizedError('Invalid or expired reset token');
  }

  // Find user with valid reset token
  const users = await executeQuery<User[]>(
    'SELECT id FROM users WHERE id = ? AND reset_token = ? AND reset_token_expires > NOW()',
    [decoded.userId, token]
  );

  if (users.length === 0) {
    throw createUnauthorizedError('Invalid or expired reset token');
  }

  // Hash new password
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Update password and clear reset token
  await executeQuery(
    'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
    [hashedPassword, decoded.userId]
  );

  res.json({ message: 'Password reset successfully.' });
}));

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createUnauthorizedError('Authentication required');
  }

  res.json({ user: req.user });
}));

// @route   POST /api/auth/refresh
// @desc    Refresh JWT token
// @access  Private
router.post('/refresh', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createUnauthorizedError('Authentication required');
  }

  const token = generateToken(req.user);

  const response: AuthResponse = {
    user: req.user,
    token
  };

  res.json(response);
}));

export default router;
