// Google OAuth User Controller
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
    // Always return a single user object, never an array
    if (Array.isArray(user)) {
      return res.status(201).json({ user: user[0] });
    }
    return res.status(201).json({ user });
  } catch (err) {
    console.error('Error storing Google user:', err);
    return res.status(500).json({ error: err.message || 'Failed to store Google user' });
  }
};
