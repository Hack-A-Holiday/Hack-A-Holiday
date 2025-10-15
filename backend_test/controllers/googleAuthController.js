// Google OAuth User Controller
const jwt = require('jsonwebtoken');
const userService = require('../services/userService');

exports.googleUser = async (req, res) => {
  try {
    // Accept both frontend and backend field names
    const { googleId, uid, email, name, displayName, profilePicture, photoURL } = req.body;
    const userUid = googleId || uid;
    const userName = name || displayName;
    const userPhoto = profilePicture || photoURL;
    if (!userUid || !email) {
      return res.status(400).json({ error: 'Missing required Google user fields' });
    }
    // Store or update Google user in DB
    const user = await userService.storeGoogleUser({
      uid: userUid,
      email,
      displayName: userName,
      photoURL: userPhoto
    });

    // Normalize to single user object
    const userObj = Array.isArray(user) ? user[0] : user;

    // Create JWT token (same behavior as regular login)
    const token = jwt.sign(
      { userId: userObj.id || userObj.uid || userObj.userId, email: userObj.email },
      process.env.JWT_SECRET || 'devsecret',
      { expiresIn: '7d' }
    );

    // Cookie options: secure in production (sameSite none), lax in dev
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    // Return user and token (token also in cookie for compatibility)
    return res.status(201).json({ user: userObj, token });
  } catch (err) {
    console.error('Error storing Google user:', err);
    return res.status(500).json({ error: err.message || 'Failed to store Google user' });
  }
};
