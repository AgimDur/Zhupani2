import { Router } from 'express';
import Joi from 'joi';
import { executeQuery } from '../database/connection';
import { Post, CreatePostRequest, Comment, CreateCommentRequest, PostVisibility } from '../types';
import { asyncHandler, createValidationError, createNotFoundError, createForbiddenError } from '../middleware/errorHandler';
import { checkFamilyPermission } from './families';

const router = Router();

// Validation schemas
const createPostSchema = Joi.object({
  title: Joi.string().min(1).max(255).required(),
  content: Joi.string().min(1).max(10000).required(),
  visibility: Joi.string().valid('public', 'family', 'admin').default('family'),
  family_id: Joi.number().optional()
});

const updatePostSchema = Joi.object({
  title: Joi.string().min(1).max(255).optional(),
  content: Joi.string().min(1).max(10000).optional(),
  visibility: Joi.string().valid('public', 'family', 'admin').optional(),
  family_id: Joi.number().optional()
});

const createCommentSchema = Joi.object({
  content: Joi.string().min(1).max(1000).required(),
  parent_comment_id: Joi.number().optional()
});

// @route   GET /api/posts
// @desc    Get posts (filtered by user permissions)
// @access  Private
router.get('/', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createForbiddenError('Authentication required');
  }

  const { family_id, visibility, author_id, page = 1, limit = 10 } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

  let query = `
    SELECT p.*, u.first_name as author_first_name, u.last_name as author_last_name,
           f.name as family_name,
           (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
    FROM posts p
    INNER JOIN users u ON p.author_id = u.id
    LEFT JOIN families f ON p.family_id = f.id
    WHERE 1=1
  `;
  const queryParams: any[] = [];

  // Filter by visibility and permissions
  if (req.user.role === 'admin') {
    // Admin can see all posts
  } else {
    query += `
      AND (
        p.visibility = 'public' OR
        (p.visibility = 'family' AND p.family_id IN (
          SELECT family_id FROM user_family_permissions WHERE user_id = ?
        )) OR
        (p.visibility = 'admin' AND ? = 'admin')
      )
    `;
    queryParams.push(req.user.id, req.user.role);
  }

  // Apply filters
  if (family_id) {
    query += ' AND p.family_id = ?';
    queryParams.push(family_id);
  }

  if (visibility) {
    query += ' AND p.visibility = ?';
    queryParams.push(visibility);
  }

  if (author_id) {
    query += ' AND p.author_id = ?';
    queryParams.push(author_id);
  }

  // Get total count for pagination
  const countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as total FROM');
  const countResult = await executeQuery<any[]>(countQuery, queryParams);
  const total = countResult[0].total;

  // Add pagination and ordering
  query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
  queryParams.push(parseInt(limit as string), offset);

  const posts = await executeQuery<Post[]>(query, queryParams);

  res.json({
    posts,
    pagination: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      totalPages: Math.ceil(total / parseInt(limit as string))
    }
  });
}));

// @route   GET /api/posts/:id
// @desc    Get post by ID
// @access  Private
router.get('/:id', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createForbiddenError('Authentication required');
  }

  const postId = parseInt(req.params.id);
  if (isNaN(postId)) {
    throw createValidationError('id', 'Invalid post ID');
  }

  // Get post details
  const posts = await executeQuery<Post[]>(`
    SELECT p.*, u.first_name as author_first_name, u.last_name as author_last_name,
           f.name as family_name
    FROM posts p
    INNER JOIN users u ON p.author_id = u.id
    LEFT JOIN families f ON p.family_id = f.id
    WHERE p.id = ?
  `, [postId]);

  if (posts.length === 0) {
    throw createNotFoundError('Post');
  }

  const post = posts[0];

  // Check permissions
  if (req.user.role !== 'admin') {
    if (post.visibility === 'admin' && req.user.role !== 'admin') {
      throw createForbiddenError('Access denied to this post');
    }
    if (post.visibility === 'family' && post.family_id) {
      const hasAccess = await checkFamilyPermission(req.user.id, post.family_id);
      if (!hasAccess) {
        throw createForbiddenError('Access denied to this post');
      }
    }
  }

  // Get comments
  const comments = await executeQuery<Comment[]>(`
    SELECT c.*, u.first_name as author_first_name, u.last_name as author_last_name
    FROM comments c
    INNER JOIN users u ON c.author_id = u.id
    WHERE c.post_id = ?
    ORDER BY c.created_at ASC
  `, [postId]);

  // Organize comments into hierarchy
  const commentMap = new Map();
  const rootComments: Comment[] = [];

  comments.forEach(comment => {
    commentMap.set(comment.id, { ...comment, replies: [] });
  });

  comments.forEach(comment => {
    if (comment.parent_comment_id) {
      const parent = commentMap.get(comment.parent_comment_id);
      if (parent) {
        parent.replies.push(commentMap.get(comment.id));
      }
    } else {
      rootComments.push(commentMap.get(comment.id));
    }
  });

  res.json({
    post: {
      ...post,
      comments: rootComments
    }
  });
}));

// @route   POST /api/posts
// @desc    Create a new post
// @access  Private
router.post('/', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createForbiddenError('Authentication required');
  }

  const { error, value } = createPostSchema.validate(req.body);
  if (error) {
    throw createValidationError('validation', error.details[0].message);
  }

  const { title, content, visibility, family_id } = value;

  // Check family permissions if family_id is provided
  if (family_id && req.user.role !== 'admin') {
    const hasAccess = await checkFamilyPermission(req.user.id, family_id, 'view');
    if (!hasAccess) {
      throw createForbiddenError('Access denied to this family');
    }
  }

  // Create post
  const result = await executeQuery<any>(
    'INSERT INTO posts (title, content, visibility, family_id, author_id) VALUES (?, ?, ?, ?, ?)',
    [title, content, visibility, family_id, req.user.id]
  );

  // Get created post
  const posts = await executeQuery<Post[]>(`
    SELECT p.*, u.first_name as author_first_name, u.last_name as author_last_name,
           f.name as family_name
    FROM posts p
    INNER JOIN users u ON p.author_id = u.id
    LEFT JOIN families f ON p.family_id = f.id
    WHERE p.id = ?
  `, [result.insertId]);

  res.status(201).json({ post: posts[0] });
}));

// @route   PUT /api/posts/:id
// @desc    Update post
// @access  Private (Author or admin)
router.put('/:id', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createForbiddenError('Authentication required');
  }

  const postId = parseInt(req.params.id);
  if (isNaN(postId)) {
    throw createValidationError('id', 'Invalid post ID');
  }

  const { error, value } = updatePostSchema.validate(req.body);
  if (error) {
    throw createValidationError('validation', error.details[0].message);
  }

  // Get post to check permissions
  const posts = await executeQuery<Post[]>(
    'SELECT * FROM posts WHERE id = ?',
    [postId]
  );

  if (posts.length === 0) {
    throw createNotFoundError('Post');
  }

  const post = posts[0];

  // Check permissions (author or admin)
  if (req.user.role !== 'admin' && post.author_id !== req.user.id) {
    throw createForbiddenError('Only the author or admin can edit this post');
  }

  // Update post
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

  updateValues.push(postId);
  await executeQuery(
    `UPDATE posts SET ${updateFields.join(', ')} WHERE id = ?`,
    updateValues
  );

  // Get updated post
  const updatedPosts = await executeQuery<Post[]>(`
    SELECT p.*, u.first_name as author_first_name, u.last_name as author_last_name,
           f.name as family_name
    FROM posts p
    INNER JOIN users u ON p.author_id = u.id
    LEFT JOIN families f ON p.family_id = f.id
    WHERE p.id = ?
  `, [postId]);

  res.json({ post: updatedPosts[0] });
}));

// @route   DELETE /api/posts/:id
// @desc    Delete post
// @access  Private (Author or admin)
router.delete('/:id', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createForbiddenError('Authentication required');
  }

  const postId = parseInt(req.params.id);
  if (isNaN(postId)) {
    throw createValidationError('id', 'Invalid post ID');
  }

  // Get post to check permissions
  const posts = await executeQuery<Post[]>(
    'SELECT * FROM posts WHERE id = ?',
    [postId]
  );

  if (posts.length === 0) {
    throw createNotFoundError('Post');
  }

  const post = posts[0];

  // Check permissions (author or admin)
  if (req.user.role !== 'admin' && post.author_id !== req.user.id) {
    throw createForbiddenError('Only the author or admin can delete this post');
  }

  // Delete post (cascade will handle comments)
  await executeQuery('DELETE FROM posts WHERE id = ?', [postId]);

  res.json({ message: 'Post deleted successfully' });
}));

// @route   POST /api/posts/:id/comments
// @desc    Add comment to post
// @access  Private
router.post('/:id/comments', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createForbiddenError('Authentication required');
  }

  const postId = parseInt(req.params.id);
  if (isNaN(postId)) {
    throw createValidationError('id', 'Invalid post ID');
  }

  const { error, value } = createCommentSchema.validate(req.body);
  if (error) {
    throw createValidationError('validation', error.details[0].message);
  }

  // Check if post exists and user has access
  const posts = await executeQuery<Post[]>(
    'SELECT * FROM posts WHERE id = ?',
    [postId]
  );

  if (posts.length === 0) {
    throw createNotFoundError('Post');
  }

  const post = posts[0];

  // Check permissions
  if (req.user.role !== 'admin') {
    if (post.visibility === 'admin' && req.user.role !== 'admin') {
      throw createForbiddenError('Access denied to this post');
    }
    if (post.visibility === 'family' && post.family_id) {
      const hasAccess = await checkFamilyPermission(req.user.id, post.family_id);
      if (!hasAccess) {
        throw createForbiddenError('Access denied to this post');
      }
    }
  }

  // Check if parent comment exists if provided
  if (value.parent_comment_id) {
    const parentComments = await executeQuery<Comment[]>(
      'SELECT * FROM comments WHERE id = ? AND post_id = ?',
      [value.parent_comment_id, postId]
    );

    if (parentComments.length === 0) {
      throw createValidationError('parent_comment_id', 'Parent comment not found');
    }
  }

  // Create comment
  const result = await executeQuery<any>(
    'INSERT INTO comments (content, post_id, author_id, parent_comment_id) VALUES (?, ?, ?, ?)',
    [value.content, postId, req.user.id, value.parent_comment_id]
  );

  // Get created comment
  const comments = await executeQuery<Comment[]>(`
    SELECT c.*, u.first_name as author_first_name, u.last_name as author_last_name
    FROM comments c
    INNER JOIN users u ON c.author_id = u.id
    WHERE c.id = ?
  `, [result.insertId]);

  res.status(201).json({ comment: comments[0] });
}));

// @route   DELETE /api/posts/:postId/comments/:commentId
// @desc    Delete comment
// @access  Private (Author or admin)
router.delete('/:postId/comments/:commentId', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createForbiddenError('Authentication required');
  }

  const commentId = parseInt(req.params.commentId);
  if (isNaN(commentId)) {
    throw createValidationError('commentId', 'Invalid comment ID');
  }

  // Get comment to check permissions
  const comments = await executeQuery<Comment[]>(
    'SELECT * FROM comments WHERE id = ?',
    [commentId]
  );

  if (comments.length === 0) {
    throw createNotFoundError('Comment');
  }

  const comment = comments[0];

  // Check permissions (author or admin)
  if (req.user.role !== 'admin' && comment.author_id !== req.user.id) {
    throw createForbiddenError('Only the author or admin can delete this comment');
  }

  // Delete comment (cascade will handle replies)
  await executeQuery('DELETE FROM comments WHERE id = ?', [commentId]);

  res.json({ message: 'Comment deleted successfully' });
}));

export default router;
