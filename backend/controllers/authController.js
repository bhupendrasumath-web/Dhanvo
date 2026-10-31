import User from '../models/User.js';
import { generateToken } from '../middleware/auth.js';
import { validationResult } from 'express-validator';

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { firstName, lastName, email, phone, password, pan } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ $or: [{ email }, { phone }] });
    if (userExists) {
      return res.status(400).json({ 
        success: false, 
        message: 'User with this email or phone already exists' 
      });
    }

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      phone,
      password,
      pan
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        nseClientCode: user.nseClientCode,
        nseUccRegistered: user.nseUccRegistered,
        nseUccRegisteredAt: user.nseUccRegisteredAt,
        accountOpeningStatus: user.accountOpeningStatus,
        nseStatus: user.nseStatus,
        nseStatusRemark: user.nseStatusRemark,
        nseStatusCheckedAt: user.nseStatusCheckedAt,
        nseRegId: user.nseRegId,
        accountBalance: user.accountBalance,
        isVerified: user.isVerified,
        token
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during registration' 
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const identifier = String(
      req.body.identifier || req.body.email || req.body.phone || ''
    ).trim();
    const credentialType = String(
      req.body.loginType || (req.body.pin ? 'pin' : 'password')
    ).trim().toLowerCase();
    const credential = credentialType === 'pin' ? req.body.pin : req.body.password;
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
    const isPhone = /^[0-9]{10}$/.test(identifier);

    if (
      (!isEmail && !isPhone) ||
      (credentialType !== 'password' && credentialType !== 'pin') ||
      typeof credential !== 'string' ||
      !credential
    ) {
      return res.status(400).json({
        success: false,
        message: 'Enter a valid email or mobile number and your password or PIN',
      });
    }

    // Find user and include password
    const existingUser = await User.findOne(
      isEmail ? { email: identifier.toLowerCase() } : { phone: identifier }
    );
    if (!existingUser) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email/mobile number or password/PIN'
      });
    }

    const user = existingUser.select ? existingUser.select('+password') : existingUser;

    const isMatch = user.loginCredentialType === credentialType
      && await user.comparePassword(credential);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email/mobile number or password/PIN'
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        nseClientCode: user.nseClientCode,
        accountBalance: user.accountBalance,
        isVerified: user.isVerified,
        portfolio: user.portfolio,
        watchlist: user.watchlist,
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login' 
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    res.json({
      success: true,
      data: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        pan: user.pan,
        nseClientCode: user.nseClientCode,
        nseUccRegistered: user.nseUccRegistered,
        nseUccRegisteredAt: user.nseUccRegisteredAt,
        accountOpeningStatus: user.accountOpeningStatus,
        nseStatus: user.nseStatus,
        nseStatusRemark: user.nseStatusRemark,
        nseStatusCheckedAt: user.nseStatusCheckedAt,
        nseRegId: user.nseRegId,
        accountBalance: user.accountBalance,
        isVerified: user.isVerified,
        portfolio: user.portfolio,
        watchlist: user.watchlist,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

export const refreshSession = (req, res) => {
  const token = generateToken(req.user._id, req.auth.sessionStartedAt);
  return res.json({
    success: true,
    data: {
      token,
      sessionExpiresAt: req.auth.sessionExpiresAt,
    },
  });
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone, pan } = req.body;
    
    const user = await User.findById(req.user._id);
    
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;
    if (pan) user.pan = pan;
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        pan: user.pan,
        nseClientCode: user.nseClientCode,
        nseUccRegistered: user.nseUccRegistered,
        nseUccRegisteredAt: user.nseUccRegisteredAt,
        accountOpeningStatus: user.accountOpeningStatus,
        nseStatus: user.nseStatus,
        nseStatusRemark: user.nseStatusRemark,
        nseStatusCheckedAt: user.nseStatusCheckedAt,
        nseRegId: user.nseRegId,
        accountBalance: user.accountBalance,
        isVerified: user.isVerified,
        portfolio: user.portfolio,
        watchlist: user.watchlist,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};
