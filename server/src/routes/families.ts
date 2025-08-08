import { Router } from 'express';
import Joi from 'joi';
import { executeQuery } from '../database/connection';
import { Family, UserFamilyPermission, PermissionLevel } from '../types';
import { asyncHandler, createValidationError, createNotFoundError, createForbiddenError } from '../middleware/errorHandler';
import { adminMiddleware, familyMemberMiddleware } from '../middleware/auth';

const router = Router();

// Validation schemas
const createFamilySchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  description: Joi.string().max(1000).optional(),
  is_public: Joi.boolean().default(false)
});

const updateFamilySchema = Joi.object({
  name: Joi.string().min(2).max(255).optional(),
  description: Joi.string().max(1000).optional(),
  is_public: Joi.boolean().optional()
});

const addMemberSchema = Joi.object({
  user_id: Joi.number().required(),
  permission_level: Joi.string().valid('view', 'edit', 'admin').default('view')
});

// Helper function to check family permissions
const checkFamilyPermission = async (
  userId: number,
  familyId: number,
  requiredLevel: PermissionLevel = 'view'
): Promise<boolean> => {
  const permissions = await executeQuery<UserFamilyPermission[]>(
    `SELECT permission_level FROM user_family_permissions 
     WHERE user_id = ? AND family_id = ?`,
    [userId, familyId]
  );

  if (permissions.length === 0) {
    return false;
  }

  const permissionLevels = { view: 1, edit: 2, admin: 3 };
  const userLevel = permissionLevels[permissions[0].permission_level];
  const requiredLevelNum = permissionLevels[requiredLevel];

  return userLevel >= requiredLevelNum;
};

// @route   GET /api/families
// @desc    Get all families (filtered by user permissions)
// @access  Private
router.get('/', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createForbiddenError('Authentication required');
  }

  let families: Family[] = [];

  if (req.user.role === 'admin') {
    // Admin can see all families
    families = await executeQuery<Family[]>(`
      SELECT f.*, u.first_name, u.last_name as created_by_name,
             (SELECT COUNT(*) FROM persons WHERE family_id = f.id) as member_count
      FROM families f
      LEFT JOIN users u ON f.created_by = u.id
      ORDER BY f.name
    `);
  } else {
    // Regular users can only see families they have access to
    families = await executeQuery<Family[]>(`
      SELECT f.*, u.first_name, u.last_name as created_by_name,
             (SELECT COUNT(*) FROM persons WHERE family_id = f.id) as member_count,
             ufp.permission_level
      FROM families f
      LEFT JOIN users u ON f.created_by = u.id
      INNER JOIN user_family_permissions ufp ON f.id = ufp.family_id
      WHERE ufp.user_id = ? OR f.is_public = TRUE
      ORDER BY f.name
    `, [req.user.id]);
  }

  res.json({ families });
}));

// @route   GET /api/families/:id
// @desc    Get family by ID
// @access  Private
router.get('/:id', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createForbiddenError('Authentication required');
  }

  const familyId = parseInt(req.params.id);
  if (isNaN(familyId)) {
    throw createValidationError('id', 'Invalid family ID');
  }

  // Get family details
  const families = await executeQuery<Family[]>(`
    SELECT f.*, u.first_name, u.last_name as created_by_name,
           (SELECT COUNT(*) FROM persons WHERE family_id = f.id) as member_count
    FROM families f
    LEFT JOIN users u ON f.created_by = u.id
    WHERE f.id = ?
  `, [familyId]);

  if (families.length === 0) {
    throw createNotFoundError('Family');
  }

  const family = families[0];

  // Check permissions
  if (req.user.role !== 'admin') {
    const hasAccess = await checkFamilyPermission(req.user.id, familyId);
    if (!hasAccess && !family.is_public) {
      throw createForbiddenError('Access denied to this family');
    }
  }

  // Get family members with permissions
  const members = await executeQuery<any[]>(`
    SELECT u.id, u.first_name, u.last_name, u.email, u.role,
           ufp.permission_level, ufp.created_at as joined_at
    FROM users u
    INNER JOIN user_family_permissions ufp ON u.id = ufp.user_id
    WHERE ufp.family_id = ?
    ORDER BY ufp.created_at
  `, [familyId]);

  res.json({
    family: {
      ...family,
      members
    }
  });
}));

// @route   POST /api/families
// @desc    Create a new family
// @access  Private (Family members and admins)
router.post('/', familyMemberMiddleware, asyncHandler(async (req, res) => {
  const { error, value } = createFamilySchema.validate(req.body);
  if (error) {
    throw createValidationError('validation', error.details[0].message);
  }

  const { name, description, is_public } = value;

  // Check if family name already exists
  const existingFamilies = await executeQuery<Family[]>(
    'SELECT id FROM families WHERE name = ?',
    [name]
  );

  if (existingFamilies.length > 0) {
    throw createValidationError('name', 'Family with this name already exists');
  }

  // Create family
  const result = await executeQuery<any>(
    'INSERT INTO families (name, description, is_public, created_by) VALUES (?, ?, ?, ?)',
    [name, description, is_public, req.user!.id]
  );

  // Add creator as admin of the family
  await executeQuery(
    'INSERT INTO user_family_permissions (user_id, family_id, permission_level) VALUES (?, ?, ?)',
    [req.user!.id, result.insertId, 'admin']
  );

  // Get created family
  const families = await executeQuery<Family[]>(`
    SELECT f.*, u.first_name, u.last_name as created_by_name
    FROM families f
    LEFT JOIN users u ON f.created_by = u.id
    WHERE f.id = ?
  `, [result.insertId]);

  res.status(201).json({ family: families[0] });
}));

// @route   PUT /api/families/:id
// @desc    Update family
// @access  Private (Admin of the family or global admin)
router.put('/:id', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createForbiddenError('Authentication required');
  }

  const familyId = parseInt(req.params.id);
  if (isNaN(familyId)) {
    throw createValidationError('id', 'Invalid family ID');
  }

  const { error, value } = updateFamilySchema.validate(req.body);
  if (error) {
    throw createValidationError('validation', error.details[0].message);
  }

  // Check if family exists
  const families = await executeQuery<Family[]>(
    'SELECT * FROM families WHERE id = ?',
    [familyId]
  );

  if (families.length === 0) {
    throw createNotFoundError('Family');
  }

  // Check permissions
  if (req.user.role !== 'admin') {
    const hasAdminAccess = await checkFamilyPermission(req.user.id, familyId, 'admin');
    if (!hasAdminAccess) {
      throw createForbiddenError('Admin access required to update family');
    }
  }

  // Update family
  const updateFields: string[] = [];
  const updateValues: any[] = [];

  if (value.name !== undefined) {
    updateFields.push('name = ?');
    updateValues.push(value.name);
  }
  if (value.description !== undefined) {
    updateFields.push('description = ?');
    updateValues.push(value.description);
  }
  if (value.is_public !== undefined) {
    updateFields.push('is_public = ?');
    updateValues.push(value.is_public);
  }

  if (updateFields.length === 0) {
    throw createValidationError('body', 'No fields to update');
  }

  updateValues.push(familyId);
  await executeQuery(
    `UPDATE families SET ${updateFields.join(', ')} WHERE id = ?`,
    updateValues
  );

  // Get updated family
  const updatedFamilies = await executeQuery<Family[]>(`
    SELECT f.*, u.first_name, u.last_name as created_by_name
    FROM families f
    LEFT JOIN users u ON f.created_by = u.id
    WHERE f.id = ?
  `, [familyId]);

  res.json({ family: updatedFamilies[0] });
}));

// @route   DELETE /api/families/:id
// @desc    Delete family
// @access  Private (Admin of the family or global admin)
router.delete('/:id', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createForbiddenError('Authentication required');
  }

  const familyId = parseInt(req.params.id);
  if (isNaN(familyId)) {
    throw createValidationError('id', 'Invalid family ID');
  }

  // Check if family exists
  const families = await executeQuery<Family[]>(
    'SELECT * FROM families WHERE id = ?',
    [familyId]
  );

  if (families.length === 0) {
    throw createNotFoundError('Family');
  }

  // Check permissions
  if (req.user.role !== 'admin') {
    const hasAdminAccess = await checkFamilyPermission(req.user.id, familyId, 'admin');
    if (!hasAdminAccess) {
      throw createForbiddenError('Admin access required to delete family');
    }
  }

  // Delete family (cascade will handle related records)
  await executeQuery('DELETE FROM families WHERE id = ?', [familyId]);

  res.json({ message: 'Family deleted successfully' });
}));

// @route   POST /api/families/:id/members
// @desc    Add member to family
// @access  Private (Admin of the family or global admin)
router.post('/:id/members', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createForbiddenError('Authentication required');
  }

  const familyId = parseInt(req.params.id);
  if (isNaN(familyId)) {
    throw createValidationError('id', 'Invalid family ID');
  }

  const { error, value } = addMemberSchema.validate(req.body);
  if (error) {
    throw createValidationError('validation', error.details[0].message);
  }

  // Check if family exists
  const families = await executeQuery<Family[]>(
    'SELECT * FROM families WHERE id = ?',
    [familyId]
  );

  if (families.length === 0) {
    throw createNotFoundError('Family');
  }

  // Check permissions
  if (req.user.role !== 'admin') {
    const hasAdminAccess = await checkFamilyPermission(req.user.id, familyId, 'admin');
    if (!hasAdminAccess) {
      throw createForbiddenError('Admin access required to add members');
    }
  }

  // Check if user exists
  const users = await executeQuery<any[]>(
    'SELECT id, first_name, last_name FROM users WHERE id = ? AND is_active = TRUE',
    [value.user_id]
  );

  if (users.length === 0) {
    throw createNotFoundError('User');
  }

  // Check if user is already a member
  const existingMembership = await executeQuery<UserFamilyPermission[]>(
    'SELECT * FROM user_family_permissions WHERE user_id = ? AND family_id = ?',
    [value.user_id, familyId]
  );

  if (existingMembership.length > 0) {
    throw createValidationError('user_id', 'User is already a member of this family');
  }

  // Add member
  await executeQuery(
    'INSERT INTO user_family_permissions (user_id, family_id, permission_level) VALUES (?, ?, ?)',
    [value.user_id, familyId, value.permission_level]
  );

  res.status(201).json({
    message: 'Member added successfully',
    member: {
      ...users[0],
      permission_level: value.permission_level
    }
  });
}));

// @route   DELETE /api/families/:id/members/:userId
// @desc    Remove member from family
// @access  Private (Admin of the family or global admin)
router.delete('/:id/members/:userId', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createForbiddenError('Authentication required');
  }

  const familyId = parseInt(req.params.id);
  const userId = parseInt(req.params.userId);

  if (isNaN(familyId) || isNaN(userId)) {
    throw createValidationError('id', 'Invalid ID');
  }

  // Check permissions
  if (req.user.role !== 'admin') {
    const hasAdminAccess = await checkFamilyPermission(req.user.id, familyId, 'admin');
    if (!hasAdminAccess) {
      throw createForbiddenError('Admin access required to remove members');
    }
  }

  // Remove member
  await executeQuery(
    'DELETE FROM user_family_permissions WHERE user_id = ? AND family_id = ?',
    [userId, familyId]
  );

  res.json({ message: 'Member removed successfully' });
}));

// @route   PUT /api/families/:id/members/:userId/permission
// @desc    Update member permission level
// @access  Private (Admin of the family or global admin)
router.put('/:id/members/:userId/permission', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createForbiddenError('Authentication required');
  }

  const familyId = parseInt(req.params.id);
  const userId = parseInt(req.params.userId);
  const { permission_level } = req.body;

  if (isNaN(familyId) || isNaN(userId)) {
    throw createValidationError('id', 'Invalid ID');
  }

  if (!['view', 'edit', 'admin'].includes(permission_level)) {
    throw createValidationError('permission_level', 'Invalid permission level');
  }

  // Check permissions
  if (req.user.role !== 'admin') {
    const hasAdminAccess = await checkFamilyPermission(req.user.id, familyId, 'admin');
    if (!hasAdminAccess) {
      throw createForbiddenError('Admin access required to update permissions');
    }
  }

  // Update permission
  await executeQuery(
    'UPDATE user_family_permissions SET permission_level = ? WHERE user_id = ? AND family_id = ?',
    [permission_level, userId, familyId]
  );

  res.json({ message: 'Permission updated successfully' });
}));

export default router;
