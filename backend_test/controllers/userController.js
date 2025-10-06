const userService = require('../services/userService');

exports.getProfile = async (req, res) => {
  // Dummy: get user from token
  const token = req.cookies.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'devsecret');
    const user = await userService.getUserById(decoded.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
