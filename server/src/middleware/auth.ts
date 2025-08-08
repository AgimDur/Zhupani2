import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { executeQuery } from '../database/connection';
import { User, JWTPayload } from '../types';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ 
        error: 'Access denied. No token provided.' 
      });
      return;
    }

    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'fallback_secret'
    ) as JWTPayload;

    // Get user from database
    const users = await executeQuery<User[]>(
      'SELECT id, email, first_name, last_name, role, is_active, email_verified, created_at, updated_at FROM users WHERE id = ? AND is_active = TRUE',
      [decoded.userId]
    );

    if (users.length === 0) {
      res.status(401).json({ 
        error: 'Invalid token. User not found.' 
      });
      return;
    }

    req.user = users[0];
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ 
      error: 'Invalid token.' 
    });
  }
};

export const adminMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ 
      error: 'Access denied. Authentication required.' 
    });
    return;
  }

  if (req.user.role !== 'admin') {
    res.status(403).json({ 
      error: 'Access denied. Admin privileges required.' 
    });
    return;
  }

  next();
};

export const familyMemberMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ 
      error: 'Access denied. Authentication required.' 
    });
    return;
  }

  if (req.user.role === 'visitor') {
    res.status(403).json({ 
      error: 'Access denied. Family member privileges required.' 
    });
    return;
  }

  next();
};

export const optionalAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      next();
      return;
    }

    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'fallback_secret'
    ) as JWTPayload;

    const users = await executeQuery<User[]>(
      'SELECT id, email, first_name, last_name, role, is_active, email_verified, created_at, updated_at FROM users WHERE id = ? AND is_active = TRUE',
      [decoded.userId]
    );

    if (users.length > 0) {
      req.user = users[0];
    }

    next();
  } catch (error) {
    // Continue without authentication for optional auth
    next();
  }
};
