const jwt = require('jsonwebtoken');

// Optional authentication middleware - doesn't block if no token
module.exports = (req, res, next) => {
  const token = req.cookies.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
  
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
      req.user = { 
        userId: decoded.userId, 
        email: decoded.email,
        id: decoded.userId 
      };
    } catch (err) {
      console.log('Optional auth: Invalid token, proceeding as guest');
      req.user = null;
    }
  } else {
    req.user = null;
  }
  
  next();
};
