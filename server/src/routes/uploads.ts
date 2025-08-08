import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { asyncHandler, createValidationError, createForbiddenError } from '../middleware/errorHandler';

const router = Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter function
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allow only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880'), // 5MB default
  },
  fileFilter: fileFilter
});

// @route   POST /api/uploads/photo
// @desc    Upload a photo
// @access  Private
router.post('/photo', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createForbiddenError('Authentication required');
  }

  // Use multer to handle the upload
  upload.single('photo')(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          throw createValidationError('file', 'File too large. Maximum size is 5MB.');
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          throw createValidationError('file', 'Unexpected file field.');
        }
      }
      throw createValidationError('file', err.message);
    }

    if (!req.file) {
      throw createValidationError('file', 'No file uploaded');
    }

    // Generate URL for the uploaded file
    const fileUrl = `/uploads/${req.file.filename}`;

    res.json({
      filename: req.file.filename,
      originalName: req.file.originalname,
      url: fileUrl,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  });
}));

// @route   POST /api/uploads/person-photo/:personId
// @desc    Upload a photo for a specific person
// @access  Private (Edit access to person's family)
router.post('/person-photo/:personId', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createForbiddenError('Authentication required');
  }

  const personId = parseInt(req.params.personId);
  if (isNaN(personId)) {
    throw createValidationError('personId', 'Invalid person ID');
  }

  // Check if person exists and user has edit access
  const { executeQuery } = require('../database/connection');
  const { checkFamilyPermission } = require('./families');

  const persons = await executeQuery(
    'SELECT * FROM persons WHERE id = ?',
    [personId]
  );

  if (persons.length === 0) {
    throw createValidationError('personId', 'Person not found');
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

  // Use multer to handle the upload
  upload.single('photo')(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          throw createValidationError('file', 'File too large. Maximum size is 5MB.');
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          throw createValidationError('file', 'Unexpected file field.');
        }
      }
      throw createValidationError('file', err.message);
    }

    if (!req.file) {
      throw createValidationError('file', 'No file uploaded');
    }

    // Generate URL for the uploaded file
    const fileUrl = `/uploads/${req.file.filename}`;

    // Update person's photo_url in database
    await executeQuery(
      'UPDATE persons SET photo_url = ? WHERE id = ?',
      [fileUrl, personId]
    );

    res.json({
      filename: req.file.filename,
      originalName: req.file.originalname,
      url: fileUrl,
      size: req.file.size,
      mimetype: req.file.mimetype,
      message: 'Photo uploaded and person updated successfully'
    });
  });
}));

// @route   DELETE /api/uploads/:filename
// @desc    Delete an uploaded file
// @access  Private (Admin or file owner)
router.delete('/:filename', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createForbiddenError('Authentication required');
  }

  const filename = req.params.filename;
  const filePath = path.join(uploadsDir, filename);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    throw createValidationError('filename', 'File not found');
  }

  // For security, only allow admins to delete files
  if (req.user.role !== 'admin') {
    throw createForbiddenError('Only admins can delete files');
  }

  // Delete the file
  fs.unlinkSync(filePath);

  res.json({ message: 'File deleted successfully' });
}));

// @route   GET /api/uploads/list
// @desc    List uploaded files (admin only)
// @access  Private (Admin)
router.get('/list', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createForbiddenError('Authentication required');
  }

  if (req.user.role !== 'admin') {
    throw createForbiddenError('Only admins can list files');
  }

  try {
    const files = fs.readdirSync(uploadsDir);
    const fileList = files.map(filename => {
      const filePath = path.join(uploadsDir, filename);
      const stats = fs.statSync(filePath);
      return {
        filename,
        url: `/uploads/${filename}`,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime
      };
    });

    res.json({ files: fileList });
  } catch (error) {
    throw createValidationError('files', 'Error reading uploads directory');
  }
}));

export default router;
