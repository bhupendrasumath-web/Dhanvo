import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const SESSION_DURATION_MS = 3 * 60 * 60 * 1000;

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const sessionStartedAt = decoded.sessionStartedAt || decoded.iat * 1000;
      const sessionExpiresAt = decoded.sessionExpiresAt || sessionStartedAt + SESSION_DURATION_MS;
      if (Date.now() >= sessionExpiresAt) {
        return res.status(401).json({
          success: false,
          code: 'SESSION_EXPIRED',
          message: 'Your session has expired. Please log in again.',
        });
      }

      req.auth = { sessionStartedAt, sessionExpiresAt };
      req.user = await User.findById(decoded.id);
      
      if (!req.user) {
        return res.status(401).json({ 
          success: false, 
          message: 'User not found' 
        });
      }
      
      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(401).json({ 
        success: false, 
        message: 'Not authorized, token failed' 
      });
    }
  }

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Not authorized, no token provided' 
    });
  }
};

export const generateToken = (id, sessionStartedAt = Date.now()) => {
  const sessionExpiresAt = sessionStartedAt + SESSION_DURATION_MS;
  const remainingSeconds = Math.max(1, Math.floor((sessionExpiresAt - Date.now()) / 1000));

  return jwt.sign({ id, sessionStartedAt, sessionExpiresAt }, process.env.JWT_SECRET, {
    expiresIn: remainingSeconds,
  });
};
