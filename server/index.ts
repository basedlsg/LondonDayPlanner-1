// server/index.ts - Simplified Version from User Prompt

// STEP 1: Load environment variables FIRST
console.log('🔧 Loading environment variables...');

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const envPath = path.resolve(process.cwd(), '.env');
console.log('📄 .env file path:', envPath);
console.log('📄 .env file exists:', fs.existsSync(envPath));

const result = dotenv.config({ path: envPath });
if (result.error) {
  console.error('❌ Error loading .env:', result.error);
} else {
  console.log('✅ Environment variables loaded by dotenv (keys found):', Object.keys(result.parsed || {}));
}

// Verify critical environment variables on process.env
console.log('🔍 Environment check (process.env):');
console.log('   DATABASE_URL present:', !!process.env.DATABASE_URL);
console.log('   GOOGLE_PLACES_API_KEY present:', !!process.env.GOOGLE_PLACES_API_KEY);
console.log('   GOOGLE_PLACES_API_KEY length:', process.env.GOOGLE_PLACES_API_KEY?.length || 0);
console.log('   GEMINI_API_KEY present:', !!process.env.GEMINI_API_KEY);

// STEP 2: Now import everything else
import express from 'express';
import { RealtimeService } from './lib/websocket';
import { performanceMiddleware, performanceMonitor } from './lib/performanceMonitor';
import session from 'express-session';
import { createServer } from 'http';
import { z } from 'zod'; // For error handling if needed

// Import database and storage (db.ts now defers initialization)
import { db, getDb } from './db'; // getDb ensures initialization
import { storage } from './storage';

// Import services and validation
import { ItineraryPlanningService, type PlanRequestOptions } from './services/ItineraryPlanningService';
import { CityConfigService } from './services/CityConfigService';
import { LocationResolver } from './services/LocationResolver';

// Import error handling and logging
import { globalErrorHandler } from './lib/errorHandler';
import { logger, requestLogger } from './lib/logging';
import { createSessionConfig } from './lib/sessionConfig';
import { apiLimiter, authLimiter } from './lib/rateLimiter';

// Import routes
import { registerRoutes } from './routes'; // This will need planningService
import authRoutes from './routes/auth';
import { collaborationRoutes } from './routes/collaboration';
import { exportRoutes } from './routes/export';
// import configRoutes from './routes/config'; // Config routes might not be needed if config is simplified or bypassed
// import itinerariesRoutes from './routes/itineraries'; // These are likely part of registerRoutes

// Import middleware
// import { attachCurrentUser } from './middleware/requireAuth'; // REMOVED
import { setupVite, serveStatic } from './vite';
import { AppError, ValidationError } from "./lib/errors"; // For global error handler

// Import and initialize config AFTER environment variables are loaded
import { config } from './config';

// Force config to reload environment variables and log status
console.log('🔧 Initializing application configuration...');
config.recheckEnvironment();
config.initialize();

const app = express();

// Test database connection
async function testDatabaseConnection() {
  try {
    console.log('🗄️  Testing database connection...');
    await getDb(); // This will trigger initialization and test the connection
    console.log('✅ Database connection successful');
  } catch (error) {
    console.error('❌ Database connection failed during testDatabaseConnection:', error);
    // Allow server to continue starting to see other logs, but this is a critical failure.
    // process.exit(1); // Optionally exit if DB is absolutely required to start
  }
}

// Session configuration
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'dev-fallback-secret-CHANGE-IN-PRODUCTION',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
};

if (!process.env.SESSION_SECRET) {
  console.warn('⚠️  SESSION_SECRET not set, using fallback. SET THIS FOR PRODUCTION!');
}

// CORS configuration for production
import cors from 'cors';

// Configure CORS for production deployment
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' ? [
    'https://planyourperfectday.app',
    'https://www.planyourperfectday.app',
    'https://app.planyourperfectday.app',
    'https://*.wix.com'
  ] : [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8080'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with']
};

app.use(cors(corsOptions));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Session middleware with enhanced security
app.use(session(createSessionConfig()));

// Performance monitoring middleware
app.use(performanceMiddleware());

// Enhanced request logging and error handling
app.use(requestLogger);

// Apply rate limiting to API routes. The limiter itself will skip if NODE_ENV is 'development'.
app.use('/api', apiLimiter);

// Routes will be registered in startServer() to ensure proper order

// Register main routes with planning service
const httpServer = createServer(app);
// Instantiate new services
const cityConfigService = new CityConfigService();
const locationResolver = new LocationResolver();
const planningService = new ItineraryPlanningService(storage, cityConfigService, locationResolver);

// Main /api/plan route with direct error handling and logging
/* // REMOVED direct /api/plan definition to avoid conflict with registerRoutes
app.post("/api/plan", async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    console.log('📝 [/api/plan] Request received:', {
// ... (rest of the old direct /api/plan route code commented out) ...
  } catch (error: any) {
    console.error('❌ [/api/plan] Unhandled error in route handler:', error.name, error.message);
    next(error); // Pass to global error handler
  }
});
*/

// Other main application routes (like those for specific itineraries, etc.)
// registerRoutes(app, planningService); // Pass planningService if routes need it // Ensure this is active in startServer
// For now, we'll assume /api/plan is the primary one. 
// ... existing code ...
async function startServer() {
  try {
    await testDatabaseConnection();
    
    // Move route registration here to ensure proper order
    app.use('/api/auth', authRoutes);
    app.use('/api/collaboration', collaborationRoutes);
    app.use('/api/export', exportRoutes);
    
    // Register API routes FIRST (before vite middleware)
    registerRoutes(app, planningService, cityConfigService);

    // Add a catch-all for unmatched API routes AFTER all route registration
    // This must be LAST to avoid intercepting valid routes
    app.use('/api/*', (req, res) => {
      console.warn(`🚫 Unmatched API route: ${req.method} ${req.path}`);
      res.status(404).json({ error: 'API endpoint not found', path: req.path });
    });

    // THEN setup vite/static serving (which has catch-all routes)
    if (process.env.NODE_ENV === 'development') {
      await setupVite(app, httpServer);
    } else {
      serveStatic(app);
    }

    // Global error handler - MUST be after all other middleware and routes
    app.use(globalErrorHandler);

    // Initialize WebSocket service
    const realtimeService = new RealtimeService(httpServer, storage);
    console.log('🔌 WebSocket service initialized');
    
    const portString = process.env.PORT || '8080'; // Standard port for Railway/production
    const port = parseInt(portString, 10);

    httpServer.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Server running on http://localhost:${port}`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🗄️  Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured (check .env or platform secrets)'}`);
      console.log(`🔑 Google Places API Key: ${process.env.GOOGLE_PLACES_API_KEY ? 'Configured' : 'MISSING (check .env)'}`);
      console.log(`🔑 Gemini API Key: ${process.env.GEMINI_API_KEY ? 'Configured' : 'MISSING (check .env)'}`);
      console.log(`🔌 WebSocket: Available at ws://localhost:${port}/ws`);
    });
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully...');
      realtimeService.shutdown();
      httpServer.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();