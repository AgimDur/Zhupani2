import { Router } from 'express';
import Joi from 'joi';
import { executeQuery } from '../database/connection';
import { Person, CreatePersonRequest, Gender } from '../types';
import { asyncHandler, createValidationError, createNotFoundError, createForbiddenError } from '../middleware/errorHandler';
import { checkFamilyPermission } from './families';

const router = Router();

// Validation schemas
const createPersonSchema = Joi.object({
  first_name: Joi.string().min(1).max(100).required(),
  last_name: Joi.string().min(1).max(100).required(),
  maiden_name: Joi.string().max(100).optional(),
  gender: Joi.string().valid('male', 'female', 'other').required(),
  birth_date: Joi.date().optional(),
  death_date: Joi.date().optional(),
  birth_place: Joi.string().max(255).optional(),
  death_place: Joi.string().max(255).optional(),
  biography: Joi.string().max(5000).optional(),
  family_id: Joi.number().optional(),
  is_deceased: Joi.boolean().default(false)
});

const updatePersonSchema = Joi.object({
  first_name: Joi.string().min(1).max(100).optional(),
  last_name: Joi.string().min(1).max(100).optional(),
  maiden_name: Joi.string().max(100).optional(),
  gender: Joi.string().valid('male', 'female', 'other').optional(),
  birth_date: Joi.date().optional(),
  death_date: Joi.date().optional(),
  birth_place: Joi.string().max(255).optional(),
  death_place: Joi.string().max(255).optional(),
  biography: Joi.string().max(5000).optional(),
  family_id: Joi.number().optional(),
  is_deceased: Joi.boolean().optional()
});

// @route   GET /api/persons
// @desc    Get all persons (filtered by user permissions)
// @access  Private
router.get('/', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createForbiddenError('Authentication required');
  }

  const { family_id, gender, search, is_deceased } = req.query;
  let persons: Person[] = [];

  let query = `
    SELECT p.*, f.name as family_name, u.first_name as created_by_first_name, u.last_name as created_by_last_name
    FROM persons p
    LEFT JOIN families f ON p.family_id = f.id
    LEFT JOIN users u ON p.created_by = u.id
    WHERE 1=1
  `;
  const queryParams: any[] = [];

  // Filter by family access
  if (req.user.role !== 'admin') {
    query += `
      AND (p.family_id IN (
        SELECT family_id FROM user_family_permissions WHERE user_id = ?
      ) OR p.family_id IN (
        SELECT id FROM families WHERE is_public = TRUE
      ))
    `;
    queryParams.push(req.user.id);
  }

  // Apply filters
  if (family_id) {
    query += ' AND p.family_id = ?';
    queryParams.push(family_id);
  }

  if (gender) {
    query += ' AND p.gender = ?';
    queryParams.push(gender);
  }

  if (is_deceased !== undefined) {
    query += ' AND p.is_deceased = ?';
    queryParams.push(is_deceased === 'true');
  }

  if (search) {
    query += ' AND (p.first_name LIKE ? OR p.last_name LIKE ? OR p.maiden_name LIKE ?)';
    const searchTerm = `%${search}%`;
    queryParams.push(searchTerm, searchTerm, searchTerm);
  }

  query += ' ORDER BY p.last_name, p.first_name';

  persons = await executeQuery<Person[]>(query, queryParams);

  res.json({ persons });
}));

// @route   GET /api/persons/:id
// @desc    Get person by ID
// @access  Private
router.get('/:id', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createForbiddenError('Authentication required');
  }

  const personId = parseInt(req.params.id);
  if (isNaN(personId)) {
    throw createValidationError('id', 'Invalid person ID');
  }

  // Get person details
  const persons = await executeQuery<Person[]>(`
    SELECT p.*, f.name as family_name, f.is_public as family_is_public,
           u.first_name as created_by_first_name, u.last_name as created_by_last_name
    FROM persons p
    LEFT JOIN families f ON p.family_id = f.id
    LEFT JOIN users u ON p.created_by = u.id
    WHERE p.id = ?
  `, [personId]);

  if (persons.length === 0) {
    throw createNotFoundError('Person');
  }

  const person = persons[0];

  // Check permissions
  if (req.user.role !== 'admin') {
    if (person.family_id) {
      const hasAccess = await checkFamilyPermission(req.user.id, person.family_id);
      if (!hasAccess && !person.family_is_public) {
        throw createForbiddenError('Access denied to this person');
      }
    }
  }

  // Get relationships
  const relationships = await executeQuery<any[]>(`
    SELECT r.*, 
           p1.first_name as person1_first_name, p1.last_name as person1_last_name,
           p2.first_name as person2_first_name, p2.last_name as person2_last_name
    FROM relationships r
    INNER JOIN persons p1 ON r.person1_id = p1.id
    INNER JOIN persons p2 ON r.person2_id = p2.id
    WHERE r.person1_id = ? OR r.person2_id = ?
    ORDER BY r.relationship_type, r.created_at
  `, [personId, personId]);

  // Get parents
  const parents = await executeQuery<Person[]>(`
    SELECT p.* FROM persons p
    INNER JOIN relationships r ON p.id = r.person1_id
    WHERE r.person2_id = ? AND r.relationship_type = 'parent_child'
    ORDER BY r.relationship_subtype = 'father' DESC, p.first_name
  `, [personId]);

  // Get children
  const children = await executeQuery<Person[]>(`
    SELECT p.* FROM persons p
    INNER JOIN relationships r ON p.id = r.person2_id
    WHERE r.person1_id = ? AND r.relationship_type = 'parent_child'
    ORDER BY p.birth_date, p.first_name
  `, [personId]);

  // Get spouses
  const spouses = await executeQuery<Person[]>(`
    SELECT p.*, r.relationship_subtype, r.marriage_date, r.divorce_date
    FROM persons p
    INNER JOIN relationships r ON (p.id = r.person1_id OR p.id = r.person2_id)
    WHERE (r.person1_id = ? OR r.person2_id = ?) 
    AND r.relationship_type = 'spouse'
    AND p.id != ?
    ORDER BY r.marriage_date, p.first_name
  `, [personId, personId, personId]);

  // Get siblings
  const siblings = await executeQuery<Person[]>(`
    SELECT DISTINCT p.* FROM persons p
    INNER JOIN relationships r1 ON p.id = r1.person2_id
    INNER JOIN relationships r2 ON r1.person1_id = r2.person1_id
    WHERE r2.person2_id = ? 
    AND r1.relationship_type = 'parent_child'
    AND r2.relationship_type = 'parent_child'
    AND p.id != ?
    ORDER BY p.birth_date, p.first_name
  `, [personId, personId]);

  res.json({
    person: {
      ...person,
      relationships,
      parents,
      children,
      spouses,
      siblings
    }
  });
}));

// @route   POST /api/persons
// @desc    Create a new person
// @access  Private (Family members and admins)
router.post('/', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createForbiddenError('Authentication required');
  }

  const { error, value } = createPersonSchema.validate(req.body);
  if (error) {
    throw createValidationError('validation', error.details[0].message);
  }

  const personData = value;

  // Check family permissions if family_id is provided
  if (personData.family_id && req.user.role !== 'admin') {
    const hasEditAccess = await checkFamilyPermission(req.user.id, personData.family_id, 'edit');
    if (!hasEditAccess) {
      throw createForbiddenError('Edit access required to add persons to this family');
    }
  }

  // Auto-assign family based on last name if not provided
  if (!personData.family_id) {
    const families = await executeQuery<any[]>(
      'SELECT id FROM families WHERE name LIKE ?',
      [`%${personData.last_name}%`]
    );
    if (families.length > 0) {
      personData.family_id = families[0].id;
    }
  }

  // Create person
  const result = await executeQuery<any>(`
    INSERT INTO persons (
      first_name, last_name, maiden_name, gender, birth_date, death_date,
      birth_place, death_place, biography, family_id, is_deceased, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    personData.first_name,
    personData.last_name,
    personData.maiden_name,
    personData.gender,
    personData.birth_date,
    personData.death_date,
    personData.birth_place,
    personData.death_place,
    personData.biography,
    personData.family_id,
    personData.is_deceased,
    req.user.id
  ]);

  // Get created person
  const persons = await executeQuery<Person[]>(`
    SELECT p.*, f.name as family_name
    FROM persons p
    LEFT JOIN families f ON p.family_id = f.id
    WHERE p.id = ?
  `, [result.insertId]);

  res.status(201).json({ person: persons[0] });
}));

// @route   PUT /api/persons/:id
// @desc    Update person
// @access  Private (Edit access to family or admin)
router.put('/:id', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createForbiddenError('Authentication required');
  }

  const personId = parseInt(req.params.id);
  if (isNaN(personId)) {
    throw createValidationError('id', 'Invalid person ID');
  }

  const { error, value } = updatePersonSchema.validate(req.body);
  if (error) {
    throw createValidationError('validation', error.details[0].message);
  }

  // Get person to check permissions
  const persons = await executeQuery<Person[]>(
    'SELECT * FROM persons WHERE id = ?',
    [personId]
  );

  if (persons.length === 0) {
    throw createNotFoundError('Person');
  }

  const person = persons[0];

  // Check permissions
  if (req.user.role !== 'admin') {
    if (person.family_id) {
      const hasEditAccess = await checkFamilyPermission(req.user.id, person.family_id, 'edit');
      if (!hasEditAccess) {
        throw createForbiddenError('Edit access required to update this person');
      }
    } else {
      throw createForbiddenError('Cannot update person without family association');
    }
  }

  // Update person
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

  updateValues.push(personId);
  await executeQuery(
    `UPDATE persons SET ${updateFields.join(', ')} WHERE id = ?`,
    updateValues
  );

  // Get updated person
  const updatedPersons = await executeQuery<Person[]>(`
    SELECT p.*, f.name as family_name
    FROM persons p
    LEFT JOIN families f ON p.family_id = f.id
    WHERE p.id = ?
  `, [personId]);

  res.json({ person: updatedPersons[0] });
}));

// @route   DELETE /api/persons/:id
// @desc    Delete person
// @access  Private (Admin access to family or global admin)
router.delete('/:id', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createForbiddenError('Authentication required');
  }

  const personId = parseInt(req.params.id);
  if (isNaN(personId)) {
    throw createValidationError('id', 'Invalid person ID');
  }

  // Get person to check permissions
  const persons = await executeQuery<Person[]>(
    'SELECT * FROM persons WHERE id = ?',
    [personId]
  );

  if (persons.length === 0) {
    throw createNotFoundError('Person');
  }

  const person = persons[0];

  // Check permissions
  if (req.user.role !== 'admin') {
    if (person.family_id) {
      const hasAdminAccess = await checkFamilyPermission(req.user.id, person.family_id, 'admin');
      if (!hasAdminAccess) {
        throw createForbiddenError('Admin access required to delete this person');
      }
    } else {
      throw createForbiddenError('Cannot delete person without family association');
    }
  }

  // Delete person (cascade will handle relationships)
  await executeQuery('DELETE FROM persons WHERE id = ?', [personId]);

  res.json({ message: 'Person deleted successfully' });
}));

// @route   GET /api/persons/:id/tree
// @desc    Get family tree data for a person
// @access  Private
router.get('/:id/tree', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createForbiddenError('Authentication required');
  }

  const personId = parseInt(req.params.id);
  if (isNaN(personId)) {
    throw createValidationError('id', 'Invalid person ID');
  }

  // Get person and check permissions
  const persons = await executeQuery<Person[]>(`
    SELECT p.*, f.name as family_name, f.is_public as family_is_public
    FROM persons p
    LEFT JOIN families f ON p.family_id = f.id
    WHERE p.id = ?
  `, [personId]);

  if (persons.length === 0) {
    throw createNotFoundError('Person');
  }

  const person = persons[0];

  // Check permissions
  if (req.user.role !== 'admin') {
    if (person.family_id) {
      const hasAccess = await checkFamilyPermission(req.user.id, person.family_id);
      if (!hasAccess && !person.family_is_public) {
        throw createForbiddenError('Access denied to this person');
      }
    }
  }

  // Get all family members for tree visualization
  const familyMembers = await executeQuery<Person[]>(`
    SELECT p.* FROM persons p
    WHERE p.family_id = ?
    ORDER BY p.birth_date, p.first_name
  `, [person.family_id]);

  // Get all relationships for the family
  const relationships = await executeQuery<any[]>(`
    SELECT r.* FROM relationships r
    INNER JOIN persons p1 ON r.person1_id = p1.id
    INNER JOIN persons p2 ON r.person2_id = p2.id
    WHERE p1.family_id = ? AND p2.family_id = ?
    ORDER BY r.relationship_type, r.created_at
  `, [person.family_id, person.family_id]);

  res.json({
    rootPerson: person,
    familyMembers,
    relationships
  });
}));

export default router;
