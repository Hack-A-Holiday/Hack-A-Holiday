const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'https://your-frontend-domain.com', // Replace with your actual frontend domain
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check endpoint for Elastic Beanstalk
app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    message: 'Hack-A-Holiday Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Import routes
const authRoutes = require('./routes/auth');
const googleAuthRoutes = require('./routes/googleAuth');
const userRoutes = require('./routes/user');
const flightRoutes = require('./routes/flights');
const aiRoutes = require('./routes/ai');
const aiAgentRoutes = require('./routes/ai-agent');
const bedrockAgentRoutes = require('./routes/bedrock-agent');
const analyticsRoutes = require('./routes/analytics');
const tripRoutes = require('./routes/trip');
const planTripRoutes = require('./routes/planTripRoutes');
const bookingRoutes = require('./routes/booking');
const globeRoutes = require('./routes/globe');
const tripadvisorRoutes = require('./routes/tripadvisor');

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/google-auth', googleAuthRoutes);
app.use('/api/user', userRoutes);
app.use('/api/flights', flightRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/ai-agent', aiAgentRoutes);
app.use('/api/bedrock-agent', bedrockAgentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/trip', tripRoutes);
app.use('/api/plantrip', planTripRoutes);
app.use('/api/booking', bookingRoutes);
app.use('/api/globe', globeRoutes);
app.use('/api/tripadvisor', tripadvisorRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: 'Route not found',
      status: 404
    }
  });
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/`);
});

module.exports = app;
