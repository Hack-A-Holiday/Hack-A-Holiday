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

/**
 * Update user profile
 * PUT /user/profile
 */
exports.updateProfile = async (req, res) => {
  const token = req.cookies.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
  if (!token) return res.status(401).json({ error: 'No token provided' });
  
  try {
    const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'devsecret');
    const userId = decoded.userId;
    const updates = req.body;
    
    // Update user profile
    const updatedUser = await userService.updateUserProfile(userId, updates);
    
    res.json({ 
      success: true, 
      message: 'Profile updated successfully',
      user: updatedUser 
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile', message: err.message });
  }
};

/**
 * Update home city specifically
 * PUT /user/profile/home-city
 * Body: { homeCity: "Mumbai" }
 */
exports.updateHomeCity = async (req, res) => {
  const token = req.cookies.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
  if (!token) return res.status(401).json({ error: 'No token provided' });
  
  try {
    const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'devsecret');
    const userId = decoded.userId;
    const { homeCity } = req.body;
    
    if (!homeCity) {
      return res.status(400).json({ error: 'homeCity is required' });
    }
    
    // Update home city
    const updatedUser = await userService.updateUserProfile(userId, { homeCity });
    
    console.log(`✅ Home city updated for user ${userId}: ${homeCity}`);
    
    res.json({ 
      success: true, 
      message: `Home city set to ${homeCity}`,
      homeCity: homeCity,
      user: updatedUser 
    });
  } catch (err) {
    console.error('Update home city error:', err);
    res.status(500).json({ error: 'Failed to update home city', message: err.message });
  }
};
