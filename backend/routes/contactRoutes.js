import express from 'express';
import { body, validationResult } from 'express-validator';
import Contact from '../models/Contact.js';

const router = express.Router();

// Validation rules for contact form
const contactValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email'),
  body('message')
    .trim()
    .notEmpty().withMessage('Message is required')
    .isLength({ max: 2000 }).withMessage('Message cannot exceed 2000 characters')
];

// Validation rules for partner application
const partnerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email'),
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
];

// @desc    Submit contact form
// @route   POST /api/contact
// @access  Public
router.post('/', contactValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { name, email, phone, subject, message } = req.body;

    const contact = await Contact.create({
      name,
      email,
      phone,
      subject,
      message,
      type: 'general'
    });

    res.status(201).json({
      success: true,
      message: 'Your message has been received. We will get back to you soon!',
      data: {
        id: contact._id,
        name: contact.name,
        email: contact.email
      }
    });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to submit your message. Please try again.' 
    });
  }
});

// @desc    Submit partner application
// @route   POST /api/contact/partner
// @access  Public
router.post('/partner', partnerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { name, email, phone, city, experience, currentBusiness, message } = req.body;

    const contact = await Contact.create({
      name,
      email,
      phone,
      city,
      experience,
      currentBusiness,
      message,
      type: 'partner',
      subject: 'Partner Application'
    });

    res.status(201).json({
      success: true,
      message: 'Your partner application has been submitted. Our team will contact you soon!',
      data: {
        id: contact._id,
        name: contact.name,
        email: contact.email
      }
    });
  } catch (error) {
    console.error('Partner application error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to submit your application. Please try again.' 
    });
  }
});

// @desc    Get all contacts (admin)
// @route   GET /api/contact
// @access  Private (Admin only - implement auth middleware)
router.get('/', async (req, res) => {
  try {
    const { type, status, page = 1, limit = 20 } = req.query;
    
    const query = {};
    if (type) query.type = type;
    if (status) query.status = status;

    const contacts = await Contact.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Contact.countDocuments(query);

    res.json({
      success: true,
      data: contacts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch contacts' 
    });
  }
});

export default router;
