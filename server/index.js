require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const path = require('path');
const database = require('./database');

const app = express();
const PORT = process.env.PORT || 8080;

// Initialize database
database.init().catch(console.error);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 5, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Validation middleware
const validateRedeemRequest = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  
  body('redeemKey')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Redeem key must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\-_]+$/)
    .withMessage('Redeem key can only contain letters, numbers, hyphens, and underscores'),
  
  body('inviteLink')
    .trim()
    .isURL({ protocols: ['https'], require_protocol: true })
    .withMessage('Invite link must be a valid HTTPS URL')
    .matches(/^https:\/\/discord\.gg\/[a-zA-Z0-9]+$/)
    .withMessage('Invite link must be a valid Discord.gg invite URL'),
];

// Helper function to get client IP
function getClientIP(req) {
  return req.headers['x-forwarded-for'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null);
}

// POST /api/redeem-order/:id - Handle redeem requests with ID parameter
app.post('/api/redeem-order/:id', validateRedeemRequest, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(err => err.msg)
      });
    }

    const { name, redeemKey, inviteLink } = req.body;
    const orderId = req.params.id;
    const email = process.env.REDEEM_EMAIL || 'burhanw997@gmail.com';
    const ipAddress = getClientIP(req);
    const userAgent = req.headers['user-agent'];

    // Check if redeem key is already used
    const isKeyUsed = await database.isKeyUsed(redeemKey);
    if (isKeyUsed) {
      return res.status(400).json({
        success: false,
        message: 'This redeem key has already been used.'
      });
    }

    // Check for recent requests from this IP (additional rate limiting)
    const recentRequests = await database.getRecentRequestsByIP(ipAddress, 15);
    if (recentRequests.length >= 3) {
      return res.status(429).json({
        success: false,
        message: 'Too many recent requests from this IP. Please wait before trying again.'
      });
    }

    // Create redeem request with order ID
    const requestId = await database.createRequest({
      name,
      redeemKey,
      inviteLink,
      email,
      ipAddress,
      userAgent,
      orderId: orderId // Store the order ID
    });

    // Mark key as used
    await database.markKeyAsUsed(redeemKey);

    // Get the created request for Discord notification
    const request = await database.getRequestById(requestId);

    // Send notification to Discord bot (if bot is running)
    try {
      // This will be handled by the Discord bot through database polling or webhook
      console.log(`New redeem order created: Order ID ${orderId}, Request ID ${requestId}, Key: ${redeemKey}`);
    } catch (discordError) {
      console.error('Error notifying Discord bot:', discordError);
      // Continue even if Discord notification fails
    }

    res.status(201).json({
      success: true,
      message: '✅ Your order has been received. Please wait while we process your redemption.',
      orderId: orderId,
      requestId: requestId
    });

  } catch (error) {
    console.error('Error processing redeem order:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.'
    });
  }
});

// POST /api/redeem - Handle redeem requests
app.post('/api/redeem', validateRedeemRequest, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(err => err.msg)
      });
    }

    const { name, redeemKey, inviteLink } = req.body;
    const email = process.env.REDEEM_EMAIL || 'burhanw997@gmail.com';
    const ipAddress = getClientIP(req);
    const userAgent = req.headers['user-agent'];

    // Check if redeem key is already used
    const isKeyUsed = await database.isKeyUsed(redeemKey);
    if (isKeyUsed) {
      return res.status(400).json({
        success: false,
        message: 'This redeem key has already been used.'
      });
    }

    // Check for recent requests from this IP (additional rate limiting)
    const recentRequests = await database.getRecentRequestsByIP(ipAddress, 15);
    if (recentRequests.length >= 3) {
      return res.status(429).json({
        success: false,
        message: 'Too many recent requests from this IP. Please wait before trying again.'
      });
    }

    // Create redeem request
    const requestId = await database.createRequest({
      name,
      redeemKey,
      inviteLink,
      email,
      ipAddress,
      userAgent
    });

    // Mark key as used
    await database.markKeyAsUsed(redeemKey);

    // Get the created request for Discord notification
    const request = await database.getRequestById(requestId);

    // Send notification to Discord bot (if bot is running)
    try {
      // This will be handled by the Discord bot through database polling or webhook
      console.log(`New redeem request created: ID ${requestId}, Key: ${redeemKey}`);
    } catch (discordError) {
      console.error('Error notifying Discord bot:', discordError);
      // Continue even if Discord notification fails
    }

    res.status(201).json({
      success: true,
      message: '✅ Your request has been received. Please wait while we process your order.',
      requestId: requestId
    });

  } catch (error) {
    console.error('Error processing redeem request:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.'
    });
  }
});

// GET /api/requests - Get all requests (for admin use)
app.get('/api/requests', async (req, res) => {
  try {
    const requests = await database.getAllRequests();
    res.json({
      success: true,
      requests: requests
    });
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching requests'
    });
  }
});

// GET /api/requests/pending - Get pending requests
app.get('/api/requests/pending', async (req, res) => {
  try {
    const requests = await database.getRequestsByStatus('PENDING');
    res.json({
      success: true,
      requests: requests
    });
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending requests'
    });
  }
});

// PUT /api/requests/:id/status - Update request status
app.put('/api/requests/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be PENDING, APPROVED, or REJECTED.'
      });
    }

    const changes = await database.updateRequestStatus(id, status);
    
    if (changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    res.json({
      success: true,
      message: `Request status updated to ${status}`
    });

  } catch (error) {
    console.error('Error updating request status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating request status'
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Serve the main HTML file for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  database.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  database.close();
  process.exit(0);
});

// Start server
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🌐 Frontend: http://localhost:${PORT}`);
  });
}

// Export for Vercel
module.exports = app;
