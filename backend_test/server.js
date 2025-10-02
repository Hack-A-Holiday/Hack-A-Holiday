require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth');
const tripRoutes = require('./routes/trip');
const bookingRoutes = require('./routes/booking');
const userRoutes = require('./routes/user');
const planTripRoutes = require('./routes/planTripRoutes');
const googleAuthRoutes = require('./routes/googleAuth');
const flightRoutes = require('./routes/flights');
const aiAgentRoutes = require('./routes/ai-agent');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());


app.use('/auth', authRoutes);
app.use('/auth', googleAuthRoutes);
app.use('/trip', tripRoutes);
app.use('/booking', bookingRoutes);
app.use('/user', userRoutes);
app.use('/flights', flightRoutes);
app.use('/ai-agent', aiAgentRoutes);
app.use('/', planTripRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Hack-A-Holiday backend running!' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
