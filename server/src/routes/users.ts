import { Router } from 'express';
import Joi from 'joi';
import bcrypt from 'bcryptjs';
import { executeQuery } from '../database/connection';
import { User, UserRole } from '../types';
import { asyncHandler, createValidationError, createNotFoundError, createForbiddenError } from '../middleware/errorHandler';
import { adminMiddleware } from '../middleware/auth';

const router = Router();

// Validation schemas
const updateProfileSchema = Joi.object({
  first_name: Joi.string().min(2).max(100).optional(),
  last_name: Joi.string().min(2).max(100).optional(),
  email: Joi.string().email().optional()
});

const updatePasswordSchema = Joi.object({
  current_password: Joi.string().required(),
  new_password: Joi.string().min(6).required()
});

const updateUserSchema = Joi.object({
  first_name: Joi.string().min(2).max(100).optional(),
  last_name: Joi.string().min(2).max(100).optional(),
  email: Joi.string().email().optional(),
  role: Joi.string().valid('admin', 'family_member', 'visitor').optional(),
  is_active: Joi.boolean().optional()
});

// @route   GET /api/users
// @desc    Get all users (admin only)
// @access  Private (Admin)
router.get('/', adminMiddleware, asyncHandler(async (req, res) => {
  const { role, is_active, search } = req.query;
  let users: User[] = [];

  let query = `
    SELECT id, email, first_name, last_name, role, is_active, email_verified, created_at, updated_at
    FROM users
    WHERE 1=1
  `;
  const queryParams: any[] = [];

  // Apply filters
  if (role) {
    query += ' AND role = ?';
    queryParams.push(role);
  }

  if (is_active !== undefined) {
    query += ' AND is_active = ?';
    queryParams.push(is_active === 'true');
  }

  if (search) {
    query += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)';
    const searchTerm = `%${search}%`;
    queryParams.push(searchTerm, searchTerm, searchTerm);
  }

  query += ' ORDER BY created_at DESC';

  users = await executeQuery<User[]>(query, queryParams);

  res.json({ users });
}));

// @route   GET /api/users/:id
// @desc    Get user by ID (admin only)
// @access  Private (Admin)
router.get('/:id', adminMiddleware, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id);
  if (isNaN(userId)) {
    throw createValidationError('id', 'Invalid user ID');
  }

  const users = await executeQuery<User[]>(`
    SELECT id, email, first_name, last_name, role, is_active, email_verified, created_at, updated_at
    FROM users
    WHERE id = ?
  `, [userId]);

  if (users.length === 0) {
    throw createNotFoundError('User');
  }

  res.json({ user: users[0] });
}));

// @route   PUT /api/users/profile
// @desc    Update current user's profile
// @access  Private
router.put('/profile', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createForbiddenError('Authentication required');
  }

  const { error, value } = updateProfileSchema.validate(req.body);
  if (error) {
    throw createValidationError('validation', error.details[0].message);
  }

  // Check if email is being changed and if it's already taken
  if (value.email && value.email !== req.user.email) {
    const existingUsers = await executeQuery<User[]>(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [value.email, req.user.id]
    );

    if (existingUsers.length > 0) {
      throw createValidationError('email', 'Email is already taken');
    }
  }

  // Update user
  const updateFields: string[] = [];
  const updateValues: any[] = [];

  Object.keys(value).forEach(key => {
    if (value[key] !== undefined) {
      updateFields.push(`${key} = ?`);
      updateValues.push(value[key]);
    }
  });

  if (updateFields.length === 0) {
    throw createValidationError('body', 'No fields to update');
  }

  updateValues.push(req.user.id);
  await executeQuery(
    `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
    updateValues
  );

  // Get updated user
  const users = await executeQuery<User[]>(`
    SELECT id, email, first_name, last_name, role, is_active, email_verified, created_at, updated_at
    FROM users
    WHERE id = ?
  `, [req.user.id]);

  res.json({ user: users[0] });
}));

// @route   PUT /api/users/password
// @desc    Update current user's password
// @access  Private
router.put('/password', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createForbiddenError('Authentication required');
  }

  const { error, value } = updatePasswordSchema.validate(req.body);
  if (error) {
    throw createValidationError('validation', error.details[0].message);
  }

  const { current_password, new_password } = value;

  // Get current password hash
  const users = await executeQuery<User[]>(
    'SELECT password FROM users WHERE id = ?',
    [req.user.id]
  );

  if (users.length === 0) {
    throw createNotFoundError('User');
  }

  // Verify current password
  const isCurrentPasswordValid = await bcrypt.compare(current_password, users[0].password!);
  if (!isCurrentPasswordValid) {
    throw createValidationError('current_password', 'Current password is incorrect');
  }

  // Hash new password
  const saltRounds = 12;
  const hashedNewPassword = await bcrypt.hash(new_password, saltRounds);

  // Update password
  await executeQuery(
    'UPDATE users SET password = ? WHERE id = ?',
    [hashedNewPassword, req.user.id]
  );

  res.json({ message: 'Password updated successfully' });
}));

// @route   PUT /api/users/:id
// @desc    Update user (admin only)
// @access  Private (Admin)
router.put('/:id', adminMiddleware, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id);
  if (isNaN(userId)) {
    throw createValidationError('id', 'Invalid user ID');
  }

  const { error, value } = updateUserSchema.validate(req.body);
  if (error) {
    throw createValidationError('validation', error.details[0].message);
  }

  // Check if user exists
  const existingUsers = await executeQuery<User[]>(
    'SELECT * FROM users WHERE id = ?',
    [userId]
  );

  if (existingUsers.length === 0) {
    throw createNotFoundError('User');
  }

  // Check if email is being changed and if it's already taken
  if (value.email && value.email !== existingUsers[0].email) {
    const emailUsers = await executeQuery<User[]>(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [value.email, userId]
    );

    if (emailUsers.length > 0) {
      throw createValidationError('email', 'Email is already taken');
    }
  }

  // Update user
  const updateFields: string[] = [];
  const updateValues: any[] = [];

  Object.keys(value).forEach(key => {
    if (value[key] !== undefined) {
      updateFields.push(`${key} = ?`);
      updateValues.push(value[key]);
    }
  });

  if (updateFields.length === 0) {
    throw createValidationError('body', 'No fields to update');
  }

  updateValues.push(userId);
  await executeQuery(
    `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
    updateValues
  );

  // Get updated user
  const updatedUsers = await executeQuery<User[]>(`
    SELECT id, email, first_name, last_name, role, is_active, email_verified, created_at, updated_at
    FROM users
    WHERE id = ?
  `, [userId]);

  res.json({ user: updatedUsers[0] });
}));

// @route   DELETE /api/users/:id
// @desc    Delete user (admin only)
// @access  Private (Admin)
router.delete('/:id', adminMiddleware, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id);
  if (isNaN(userId)) {
    throw createValidationError('id', 'Invalid user ID');
  }

  // Prevent admin from deleting themselves
  if (userId === req.user!.id) {
    throw createValidationError('id', 'Cannot delete your own account');
  }

  // Check if user exists
  const users = await executeQuery<User[]>(
    'SELECT * FROM users WHERE id = ?',
    [userId]
  );

  if (users.length === 0) {
    throw createNotFoundError('User');
  }

  // Delete user (cascade will handle related records)
  await executeQuery('DELETE FROM users WHERE id = ?', [userId]);

  res.json({ message: 'User deleted successfully' });
}));

// @route   POST /api/users/:id/activate
// @desc    Activate/deactivate user (admin only)
// @access  Private (Admin)
router.post('/:id/activate', adminMiddleware, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id);
  if (isNaN(userId)) {
    throw createValidationError('id', 'Invalid user ID');
  }

  const { is_active } = req.body;

  if (typeof is_active !== 'boolean') {
    throw createValidationError('is_active', 'is_active must be a boolean');
  }

  // Check if user exists
  const users = await executeQuery<User[]>(
    'SELECT * FROM users WHERE id = ?',
    [userId]
  );

  if (users.length === 0) {
    throw createNotFoundError('User');
  }

  // Update user status
  await executeQuery(
    'UPDATE users SET is_active = ? WHERE id = ?',
    [is_active, userId]
  );

  res.json({ 
    message: `User ${is_active ? 'activated' : 'deactivated'} successfully`,
    is_active
  });
}));

// @route   GET /api/users/stats
// @desc    Get user statistics (admin only)
// @access  Private (Admin)
router.get('/stats', adminMiddleware, asyncHandler(async (req, res) => {
  const stats = await executeQuery<any[]>(`
    SELECT 
      COUNT(*) as total_users,
      SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_users,
      SUM(CASE WHEN is_active = FALSE THEN 1 ELSE 0 END) as inactive_users,
      SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin_users,
      SUM(CASE WHEN role = 'family_member' THEN 1 ELSE 0 END) as family_member_users,
      SUM(CASE WHEN role = 'visitor' THEN 1 ELSE 0 END) as visitor_users,
      SUM(CASE WHEN email_verified = TRUE THEN 1 ELSE 0 END) as verified_users,
      SUM(CASE WHEN email_verified = FALSE THEN 1 ELSE 0 END) as unverified_users
    FROM users
  `);

  const recentUsers = await executeQuery<any[]>(`
    SELECT id, email, first_name, last_name, role, created_at
    FROM users
    ORDER BY created_at DESC
    LIMIT 10
  `);

  res.json({
    stats: stats[0],
    recentUsers
  });
}));

export default router;
