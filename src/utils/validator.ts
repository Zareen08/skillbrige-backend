import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

export const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').notEmpty().trim(),
  body('role').isIn(['STUDENT', 'TUTOR']),
];

export const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

export const bookingValidation = [
  body('tutorId').notEmpty(),
  body('date').isISO8601(),
  body('duration').isInt({ min: 30, max: 480 }),
];

export const reviewValidation = [
  body('rating').isInt({ min: 1, max: 5 }),
  body('comment').notEmpty().trim(),
  body('bookingId').notEmpty(),
];

export const tutorProfileValidation = [
  body('title').optional().notEmpty(),
  body('hourlyRate').optional().isFloat({ min: 0 }),
  body('experience').optional().isInt({ min: 0 }),
  body('subjects').optional().isArray(),
];