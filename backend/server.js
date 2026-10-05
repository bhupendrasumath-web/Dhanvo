import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import otpRoutes from './routes/otpRoutes.js';
import panRoutes from './routes/panRoutes.js';
import marketRoutes from './routes/marketRoutes.js';
import contactRoutes from './routes/contactRoutes.js';

// Load env vars
dotenv.config();

const app = express();

// Track DB connection status
let dbConnected = false;

// Connect to database
const initDB = async () => {
  dbConnected = await connectDB();
};
initDB();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://dhanvo.in',
    'https://www.dhanvo.in',
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', otpRoutes);
app.use('/api/auth', panRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/contact', contactRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Dhanwo API is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error' 
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
🚀 Dhanwo (धनवो) Server running on port ${PORT}
📊 API Health: http://localhost:${PORT}/api/health
🔐 Auth Routes: http://localhost:${PORT}/api/auth
📈 Market Routes: http://localhost:${PORT}/api/market
  `);
});
