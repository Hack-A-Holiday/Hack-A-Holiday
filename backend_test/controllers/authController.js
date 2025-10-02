const jwt = require('jsonwebtoken');
const userService = require('../services/userService');

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await userService.authenticate(email, password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  // Always return a single user object, never an array
  const userObj = Array.isArray(user) ? user[0] : user;
  const token = jwt.sign({ userId: userObj.id, email: userObj.email }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '7d' });
  res.cookie('token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
  });
  res.json({ user: userObj, token });
};

exports.signup = async (req, res) => {
  const { email, password, name } = req.body;
  const user = await userService.createUser(email, password, name);
  if (!user) return res.status(400).json({ error: 'User already exists' });
  // Do NOT log in user after signup. Require login.
  res.status(201).json({ success: true, message: 'Signup successful. Please log in.' });
};

exports.me = async (req, res) => {
  const token = req.cookies.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
    const user = await userService.getUserById(decoded.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
