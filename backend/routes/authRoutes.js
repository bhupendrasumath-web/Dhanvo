import express from 'express';
import { body } from 'express-validator';
import { register, login, getMe, refreshSession, updateProfile } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Validation rules
const registerValidation = [
  body('firstName')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isLength({ max: 50 }).withMessage('First name cannot exceed 50 characters'),
  body('lastName')
    .trim()
    .notEmpty().withMessage('Last name is required')
    .isLength({ max: 50 }).withMessage('Last name cannot exceed 50 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email'),
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^[0-9]{10}$/).withMessage('Please enter a valid 10-digit phone number'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase and number')
];

const loginValidation = [
  body('identifier').optional().trim(),
  body('email').optional().trim().isEmail().withMessage('Please enter a valid email'),
  body('phone').optional().trim().matches(/^[0-9]{10}$/).withMessage('Please enter a valid 10-digit phone number'),
  body('password').optional().isString(),
  body('pin').optional().matches(/^[0-9]{6}$/).withMessage('PIN must contain 6 digits'),
];

// Routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/me', protect, getMe);
router.post('/refresh-session', protect, refreshSession);
router.put('/profile', protect, updateProfile);

export default router;
