const { v4: uuidv4 } = require('uuid');
const userModel = require('../models/userModel');

// In-memory user storage for Google OAuth (replace with DB logic as needed)
const users = [];

exports.createUser = async (email, password, name) => {
  const existing = await userModel.getUserByEmail(email);
  if (existing) return null;
  const id = uuidv4();
  const user = {
    PK: `USER#${id}`,
    SK: 'PROFILE',
    GSI1PK: `EMAIL#${email}`,
    GSI1SK: 'USER',
    id,
    email,
    password,
    name,
    role: 'normal',
    preferences: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isEmailVerified: false
  };
  await userModel.createUser(user);
  // Remove password for normal users
  if ('password' in user) {
    const { password, ...userNoPass } = user;
    return userNoPass;
  }
  return user;
};

exports.authenticate = async (email, password) => {
  const user = await userModel.getUserByEmail(email);
  if (!user || user.password !== password) return null;
  if (user && 'password' in user) {
    const { password, ...userNoPass } = user;
    return userNoPass;
  }
  return user;
};

exports.getUserById = async (id) => {
  const user = await userModel.getUserById(id);
  if (!user) return null;
  const { password: pwd, ...userNoPass } = user;
  return userNoPass;
};

exports.storeGoogleUser = async ({ uid, email, displayName, photoURL }) => {
  // Check if user already exists in DynamoDB
  let user = await userModel.getUserByEmail(email);
  if (!user) {
    const id = uid || require('uuid').v4();
    user = {
      PK: `USER#${id}`,
      SK: 'PROFILE',
      GSI1PK: `EMAIL#${email}`,
      GSI1SK: 'USER',
      id,
      uid,
      email,
      name: displayName,
      displayName,
      profilePicture: photoURL,
      role: 'google',
      isEmailVerified: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      preferences: {},
    };
    await userModel.createUser(user);
  } else {
    // Update user info if needed
    user.displayName = displayName;
    user.profilePicture = photoURL;
    user.lastLoginAt = new Date().toISOString();
    await userModel.updateUser(user);
  }
  // Remove password before returning
  const { password: pwd, ...userNoPass } = user;
  return userNoPass;
};

/**
 * Update user profile with any fields
 * @param {string} userId - User ID
 * @param {object} updates - Fields to update (e.g., { homeCity: "Mumbai", travelStyle: "budget" })
 */
exports.updateUserProfile = async (userId, updates) => {
  const user = await userModel.getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  
  // Merge updates into user object
  const updatedUser = {
    ...user,
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  // If updating preferences specifically, merge those too
  if (updates.preferences) {
    updatedUser.preferences = {
      ...user.preferences,
      ...updates.preferences
    };
  }
  
  // If homeCity is provided, also store it in preferences for AI agent
  if (updates.homeCity) {
    updatedUser.preferences = updatedUser.preferences || {};
    updatedUser.preferences.homeCity = updates.homeCity;
  }
  
  await userModel.updateUser(updatedUser);
  
  // Remove password before returning
  const { password, ...userNoPass } = updatedUser;
  return userNoPass;
};
