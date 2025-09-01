const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
// Load environment variables if .env file exists
try {
  require('dotenv').config();
} catch (error) {
  console.log('No .env file found, using default values');
}

// Import database connection
const connectDB = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const serviceRoutes = require('./routes/services');

const app = express();
const PORT = process.env.PORT || 5000;

// Set default environment variables if not provided
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'az_globe_super_secret_jwt_key_2024_development';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/az_globe_db';

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser middleware
app.use(cookieParser());

// Basic route for testing
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to A-Z Globe Multi-Service Platform API',
    version: '1.0.0',
    status: 'Server is running successfully'
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: 'The requested endpoint does not exist'
  });
});

// Connect to database and start server
const startServer = async () => {
  try {
    const dbConnected = await connectDB();
    
    app.listen(PORT, () => {
      console.log(`🚀 A-Z Globe Server running on port ${PORT}`);
      console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 Server URL: http://localhost:${PORT}`);
      if (dbConnected) {
        console.log(`🗄️  Database: Connected to MongoDB`);
      } else {
        console.log(`⚠️  Database: Running without database connection (development mode)`);
      }
      console.log(`🔐 Auth Routes: /api/auth`);
      console.log(`🛠️  Service Routes: /api/services`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
