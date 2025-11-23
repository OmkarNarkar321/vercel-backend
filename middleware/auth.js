// backend/middleware/auth.js
const jwt = require('jsonwebtoken');

// JWT Secret (should match the one in your routes/auth.js)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

// Middleware to verify JWT token and authenticate user
const authenticateToken = (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    // Check if token exists
    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 🆕 DEBUG: Log decoded token to verify structure
    console.log('✅ Token decoded successfully:', {
      userId: decoded.userId,
      email: decoded.email,
      iat: new Date(decoded.iat * 1000).toISOString(),
      exp: new Date(decoded.exp * 1000).toISOString()
    });
    
    // Attach user info to request object
    req.user = decoded;
    
    // Continue to next middleware/route handler
    next();

  } catch (error) {
    console.error('❌ Token verification error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Token verification failed',
      error: error.message
    });
  }
};

// Middleware to check if user is a student
const isStudent = (req, res, next) => {
  if (req.user.userType !== 'student') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Student account required.'
    });
  }
  next();
};

// Optional: Middleware to check multiple user types
const checkUserType = (...allowedTypes) => {
  return (req, res, next) => {
    if (!allowedTypes.includes(req.user.userType)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required user type: ${allowedTypes.join(' or ')}`
      });
    }
    next();
  };
};

module.exports = {
  authenticateToken,
  isStudent,
  checkUserType
};