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

/**
 * Soft delete user account
 * DELETE /user/account
 * Marks account as deleted with 30-day retention period
 */
exports.deleteAccount = async (req, res) => {
  const token = req.cookies.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
  
  console.log('🔍 Delete account request received');
  console.log('🔍 Token from cookies:', req.cookies.token ? 'present' : 'missing');
  console.log('🔍 Token from Authorization header:', req.headers.authorization ? 'present' : 'missing');
  console.log('🔍 Final token:', token ? `present (length: ${token.length})` : 'missing');
  
  if (!token) {
    console.log('❌ No token provided');
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    console.log('🔍 Attempting to verify token...');
    const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'devsecret');
    const userId = decoded.userId;
    console.log('✅ Token verified, userId:', userId);
    
    // Soft delete the user (sets isDeleted flag and 30-day TTL)
    await userService.softDeleteUser(userId);
    
    console.log(`🗑️ Account deleted for user ${userId}`);
    
    res.json({ 
      success: true, 
      message: 'Account deleted successfully. Your data will be kept for 30 days in case you change your mind.',
    });
  } catch (err) {
    console.error('❌ Delete account error:', err);
    console.error('❌ Error stack:', err.stack);
    res.status(500).json({ error: 'Failed to delete account', message: err.message, details: err.stack });
  }
};
