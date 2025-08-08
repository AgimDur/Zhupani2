import { Router } from 'express';
import Joi from 'joi';
import { executeQuery } from '../database/connection';
import { Relationship, CreateRelationshipRequest, RelationshipType, RelationshipSubtype } from '../types';
import { asyncHandler, createValidationError, createNotFoundError, createForbiddenError } from '../middleware/errorHandler';
import { checkFamilyPermission } from './families';

const router = Router();

// Validation schemas
const createRelationshipSchema = Joi.object({
  person1_id: Joi.number().required(),
  person2_id: Joi.number().required(),
  relationship_type: Joi.string().valid('parent_child', 'spouse', 'sibling').required(),
  relationship_subtype: Joi.string().valid('mother', 'father', 'husband', 'wife', 'ex_husband', 'ex_wife', 'brother', 'sister').required(),
  marriage_date: Joi.date().optional(),
  divorce_date: Joi.date().optional()
});

const updateRelationshipSchema = Joi.object({
  relationship_subtype: Joi.string().valid('mother', 'father', 'husband', 'wife', 'ex_husband', 'ex_wife', 'brother', 'sister').optional(),
  marriage_date: Joi.date().optional(),
  divorce_date: Joi.date().optional(),
  is_active: Joi.boolean().optional()
});

// @route   GET /api/relationships
// @desc    Get relationships (filtered by user permissions)
// @access  Private
router.get('/', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createForbiddenError('Authentication required');
  }

  const { person_id, family_id, type } = req.query;
  let relationships: Relationship[] = [];

  let query = `
    SELECT r.*, 
           p1.first_name as person1_first_name, p1.last_name as person1_last_name, p1.gender as person1_gender,
           p2.first_name as person2_first_name, p2.last_name as person2_last_name, p2.gender as person2_gender
    FROM relationships r
    INNER JOIN persons p1 ON r.person1_id = p1.id
    INNER JOIN persons p2 ON r.person2_id = p2.id
    WHERE 1=1
  `;
  const queryParams: any[] = [];

  // Filter by family access
  if (req.user.role !== 'admin') {
    query += `
      AND (p1.family_id IN (
        SELECT family_id FROM user_family_permissions WHERE user_id = ?
      ) OR p1.family_id IN (
        SELECT id FROM families WHERE is_public = TRUE
      ))
      AND (p2.family_id IN (
        SELECT family_id FROM user_family_permissions WHERE user_id = ?
      ) OR p2.family_id IN (
        SELECT id FROM families WHERE is_public = TRUE
      ))
    `;
    queryParams.push(req.user.id, req.user.id);
  }

  // Apply filters
  if (person_id) {
    query += ' AND (r.person1_id = ? OR r.person2_id = ?)';
    queryParams.push(person_id, person_id);
  }

  if (family_id) {
    query += ' AND p1.family_id = ? AND p2.family_id = ?';
    queryParams.push(family_id, family_id);
  }

  if (type) {
    query += ' AND r.relationship_type = ?';
    queryParams.push(type);
  }

  query += ' ORDER BY r.relationship_type, r.created_at';

  relationships = await executeQuery<Relationship[]>(query, queryParams);

  res.json({ relationships });
}));

// @route   GET /api/relationships/:id
// @desc    Get relationship by ID
// @access  Private
router.get('/:id', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createForbiddenError('Authentication required');
  }

  const relationshipId = parseInt(req.params.id);
  if (isNaN(relationshipId)) {
    throw createValidationError('id', 'Invalid relationship ID');
  }

  // Get relationship details
  const relationships = await executeQuery<Relationship[]>(`
    SELECT r.*, 
           p1.first_name as person1_first_name, p1.last_name as person1_last_name, p1.gender as person1_gender,
           p2.first_name as person2_first_name, p2.last_name as person2_last_name, p2.gender as person2_gender
    FROM relationships r
    INNER JOIN persons p1 ON r.person1_id = p1.id
    INNER JOIN persons p2 ON r.person2_id = p2.id
    WHERE r.id = ?
  `, [relationshipId]);

  if (relationships.length === 0) {
    throw createNotFoundError('Relationship');
  }

  const relationship = relationships[0];

  // Check permissions
  if (req.user.role !== 'admin') {
    // Check if user has access to both persons' families
    const person1Families = await executeQuery<any[]>(
      'SELECT family_id FROM user_family_permissions WHERE user_id = ?',
      [req.user.id]
    );
    const person2Families = await executeQuery<any[]>(
      'SELECT family_id FROM user_family_permissions WHERE user_id = ?',
      [req.user.id]
    );
    const publicFamilies = await executeQuery<any[]>(
      'SELECT id FROM families WHERE is_public = TRUE'
    );

    const hasAccess = person1Families.some(f => f.family_id === relationship.person1_id) ||
                     person2Families.some(f => f.family_id === relationship.person2_id) ||
                     publicFamilies.some(f => f.id === relationship.person1_id) ||
                     publicFamilies.some(f => f.id === relationship.person2_id);

    if (!hasAccess) {
      throw createForbiddenError('Access denied to this relationship');
    }
  }

  res.json({ relationship });
}));

// @route   POST /api/relationships
// @desc    Create a new relationship
// @access  Private (Edit access to both families or admin)
router.post('/', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createForbiddenError('Authentication required');
  }

  const { error, value } = createRelationshipSchema.validate(req.body);
  if (error) {
    throw createValidationError('validation', error.details[0].message);
  }

  const { person1_id, person2_id, relationship_type, relationship_subtype, marriage_date, divorce_date } = value;

  // Check if persons exist and get their family IDs
  const persons = await executeQuery<any[]>(
    'SELECT id, family_id FROM persons WHERE id IN (?, ?)',
    [person1_id, person2_id]
  );

  if (persons.length !== 2) {
    throw createNotFoundError('One or both persons not found');
  }

  const person1 = persons.find(p => p.id === person1_id);
  const person2 = persons.find(p => p.id === person2_id);

  // Check permissions
  if (req.user.role !== 'admin') {
    if (person1.family_id) {
      const hasEditAccess1 = await checkFamilyPermission(req.user.id, person1.family_id, 'edit');
      if (!hasEditAccess1) {
        throw createForbiddenError('Edit access required to person 1 family');
      }
    }
    if (person2.family_id) {
      const hasEditAccess2 = await checkFamilyPermission(req.user.id, person2.family_id, 'edit');
      if (!hasEditAccess2) {
        throw createForbiddenError('Edit access required to person 2 family');
      }
    }
  }

  // Check if relationship already exists
  const existingRelationships = await executeQuery<Relationship[]>(
    'SELECT * FROM relationships WHERE person1_id = ? AND person2_id = ? AND relationship_type = ?',
    [person1_id, person2_id, relationship_type]
  );

  if (existingRelationships.length > 0) {
    throw createValidationError('relationship', 'This relationship already exists');
  }

  // Validate relationship logic
  if (relationship_type === 'parent_child') {
    if (relationship_subtype !== 'mother' && relationship_subtype !== 'father') {
      throw createValidationError('relationship_subtype', 'Parent-child relationships must be mother or father');
    }
  } else if (relationship_type === 'spouse') {
    if (!['husband', 'wife', 'ex_husband', 'ex_wife'].includes(relationship_subtype)) {
      throw createValidationError('relationship_subtype', 'Spouse relationships must be husband, wife, ex_husband, or ex_wife');
    }
  } else if (relationship_type === 'sibling') {
    if (relationship_subtype !== 'brother' && relationship_subtype !== 'sister') {
      throw createValidationError('relationship_subtype', 'Sibling relationships must be brother or sister');
    }
  }

  // Create relationship
  const result = await executeQuery<any>(
    'INSERT INTO relationships (person1_id, person2_id, relationship_type, relationship_subtype, marriage_date, divorce_date) VALUES (?, ?, ?, ?, ?, ?)',
    [person1_id, person2_id, relationship_type, relationship_subtype, marriage_date, divorce_date]
  );

  // Get created relationship
  const createdRelationships = await executeQuery<Relationship[]>(`
    SELECT r.*, 
           p1.first_name as person1_first_name, p1.last_name as person1_last_name,
           p2.first_name as person2_first_name, p2.last_name as person2_last_name
    FROM relationships r
    INNER JOIN persons p1 ON r.person1_id = p1.id
    INNER JOIN persons p2 ON r.person2_id = p2.id
    WHERE r.id = ?
  `, [result.insertId]);

  res.status(201).json({ relationship: createdRelationships[0] });
}));

// @route   PUT /api/relationships/:id
// @desc    Update relationship
// @access  Private (Edit access to both families or admin)
router.put('/:id', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createForbiddenError('Authentication required');
  }

  const relationshipId = parseInt(req.params.id);
  if (isNaN(relationshipId)) {
    throw createValidationError('id', 'Invalid relationship ID');
  }

  const { error, value } = updateRelationshipSchema.validate(req.body);
  if (error) {
    throw createValidationError('validation', error.details[0].message);
  }

  // Get relationship to check permissions
  const relationships = await executeQuery<Relationship[]>(
    'SELECT * FROM relationships WHERE id = ?',
    [relationshipId]
  );

  if (relationships.length === 0) {
    throw createNotFoundError('Relationship');
  }

  const relationship = relationships[0];

  // Get persons to check family permissions
  const persons = await executeQuery<any[]>(
    'SELECT id, family_id FROM persons WHERE id IN (?, ?)',
    [relationship.person1_id, relationship.person2_id]
  );

  // Check permissions
  if (req.user.role !== 'admin') {
    for (const person of persons) {
      if (person.family_id) {
        const hasEditAccess = await checkFamilyPermission(req.user.id, person.family_id, 'edit');
        if (!hasEditAccess) {
          throw createForbiddenError('Edit access required to update this relationship');
        }
      }
    }
  }

  // Update relationship
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

  updateValues.push(relationshipId);
  await executeQuery(
    `UPDATE relationships SET ${updateFields.join(', ')} WHERE id = ?`,
    updateValues
  );

  // Get updated relationship
  const updatedRelationships = await executeQuery<Relationship[]>(`
    SELECT r.*, 
           p1.first_name as person1_first_name, p1.last_name as person1_last_name,
           p2.first_name as person2_first_name, p2.last_name as person2_last_name
    FROM relationships r
    INNER JOIN persons p1 ON r.person1_id = p1.id
    INNER JOIN persons p2 ON r.person2_id = p2.id
    WHERE r.id = ?
  `, [relationshipId]);

  res.json({ relationship: updatedRelationships[0] });
}));

// @route   DELETE /api/relationships/:id
// @desc    Delete relationship
// @access  Private (Edit access to both families or admin)
router.delete('/:id', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createForbiddenError('Authentication required');
  }

  const relationshipId = parseInt(req.params.id);
  if (isNaN(relationshipId)) {
    throw createValidationError('id', 'Invalid relationship ID');
  }

  // Get relationship to check permissions
  const relationships = await executeQuery<Relationship[]>(
    'SELECT * FROM relationships WHERE id = ?',
    [relationshipId]
  );

  if (relationships.length === 0) {
    throw createNotFoundError('Relationship');
  }

  const relationship = relationships[0];

  // Get persons to check family permissions
  const persons = await executeQuery<any[]>(
    'SELECT id, family_id FROM persons WHERE id IN (?, ?)',
    [relationship.person1_id, relationship.person2_id]
  );

  // Check permissions
  if (req.user.role !== 'admin') {
    for (const person of persons) {
      if (person.family_id) {
        const hasEditAccess = await checkFamilyPermission(req.user.id, person.family_id, 'edit');
        if (!hasEditAccess) {
          throw createForbiddenError('Edit access required to delete this relationship');
        }
      }
    }
  }

  // Delete relationship
  await executeQuery('DELETE FROM relationships WHERE id = ?', [relationshipId]);

  res.json({ message: 'Relationship deleted successfully' });
}));

// @route   POST /api/relationships/bulk
// @desc    Create multiple relationships at once
// @access  Private (Edit access to all families or admin)
router.post('/bulk', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createForbiddenError('Authentication required');
  }

  const { relationships } = req.body;

  if (!Array.isArray(relationships) || relationships.length === 0) {
    throw createValidationError('relationships', 'Relationships array is required');
  }

  // Validate all relationships
  for (const rel of relationships) {
    const { error } = createRelationshipSchema.validate(rel);
    if (error) {
      throw createValidationError('validation', `Relationship validation failed: ${error.details[0].message}`);
    }
  }

  // Check permissions for all persons involved
  const personIds = [...new Set(relationships.flatMap(r => [r.person1_id, r.person2_id]))];
  const persons = await executeQuery<any[]>(
    `SELECT id, family_id FROM persons WHERE id IN (${personIds.map(() => '?').join(',')})`,
    personIds
  );

  if (persons.length !== personIds.length) {
    throw createNotFoundError('One or more persons not found');
  }

  // Check permissions
  if (req.user.role !== 'admin') {
    for (const person of persons) {
      if (person.family_id) {
        const hasEditAccess = await checkFamilyPermission(req.user.id, person.family_id, 'edit');
        if (!hasEditAccess) {
          throw createForbiddenError(`Edit access required to family of person ${person.id}`);
        }
      }
    }
  }

  // Create relationships in transaction
  const createdRelationships: Relationship[] = [];

  for (const rel of relationships) {
    // Check if relationship already exists
    const existing = await executeQuery<Relationship[]>(
      'SELECT * FROM relationships WHERE person1_id = ? AND person2_id = ? AND relationship_type = ?',
      [rel.person1_id, rel.person2_id, rel.relationship_type]
    );

    if (existing.length === 0) {
      const result = await executeQuery<any>(
        'INSERT INTO relationships (person1_id, person2_id, relationship_type, relationship_subtype, marriage_date, divorce_date) VALUES (?, ?, ?, ?, ?, ?)',
        [rel.person1_id, rel.person2_id, rel.relationship_type, rel.relationship_subtype, rel.marriage_date, rel.divorce_date]
      );

      const created = await executeQuery<Relationship[]>(`
        SELECT r.*, 
               p1.first_name as person1_first_name, p1.last_name as person1_last_name,
               p2.first_name as person2_first_name, p2.last_name as person2_last_name
        FROM relationships r
        INNER JOIN persons p1 ON r.person1_id = p1.id
        INNER JOIN persons p2 ON r.person2_id = p2.id
        WHERE r.id = ?
      `, [result.insertId]);

      createdRelationships.push(created[0]);
    }
  }

  res.status(201).json({ 
    relationships: createdRelationships,
    message: `Created ${createdRelationships.length} new relationships`
  });
}));

export default router;
