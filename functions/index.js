const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');

// Initialize Express app
const app = express();

// Enable CORS
app.use(cors({ origin: true }));
app.use(express.json());

// Import environment variables (you'll need to set these in Firebase)
process.env.GEMINI_API_KEY = functions.config().gemini?.key || process.env.GEMINI_API_KEY;
process.env.GOOGLE_PLACES_API_KEY = functions.config().google?.places_key || process.env.GOOGLE_PLACES_API_KEY;
process.env.GOOGLE_WEATHER_API_KEY = functions.config().google?.weather_key || process.env.GOOGLE_WEATHER_API_KEY;

// Import your server logic (we'll need to adapt this)
const { createServer } = require('./server-adapter');

// Initialize server
const server = createServer();

// API Routes
app.post('/plan', async (req, res) => {
  try {
    // Forward request to your existing server logic
    const response = await server.handlePlanRequest(req.body);
    res.json(response);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      message: error.message || 'Internal server error'
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Export the Express app as a Firebase Function
exports.api = functions.https.onRequest(app);
