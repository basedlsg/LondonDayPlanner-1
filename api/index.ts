// API entry point optimized for Vercel serverless deployment

// STEP 1: Validate environment variables FIRST
import { logger, requestLogger } from './lib/logging';
import { validateEnvironment, getEnvironmentConfig } from './lib/environment';

// Validate environment on startup
let environmentConfig;
try {
  environmentConfig = validateEnvironment();
  logger.info('✅ [Startup] Environment validation successful', undefined, 'STARTUP');
} catch (error) {
  logger.error('❌ [Startup] Environment validation failed:', error, 'STARTUP');
  // For serverless, we need to throw here to prevent the function from starting
  throw new Error(`Environment validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
}

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

// Import and initialize config using validated environment
import { config } from './config';

// Initialize config with validated environment
logger.info('🔧 [Startup] Initializing application configuration...', undefined, 'STARTUP');
try {
  config.recheckEnvironment();
  config.initialize();
  logger.info('✅ [Startup] Application configuration initialized', undefined, 'STARTUP');
} catch (error) {
  logger.error('❌ [Startup] Configuration initialization failed:', error, 'STARTUP');
  throw error;
}

const app = express();

// Test database connection with proper error handling
async function testDatabaseConnection(): Promise<void> {
  try {
    logger.info('🗄️ [Startup] Testing database connection...', undefined, 'DB');
    await getDb(); // This will trigger initialization and test the connection
    logger.info('✅ [Startup] Database connection successful', undefined, 'DB');
  } catch (error) {
    logger.error('❌ [Startup] Database connection failed:', error, 'DB');
    // In serverless environment, we should throw to prevent function from starting with broken DB
    throw new Error(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Session configuration using validated environment
const sessionConfig = {
  secret: environmentConfig.SESSION_SECRET || 'dev-fallback-secret-CHANGE-IN-PRODUCTION',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: environmentConfig.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
};

if (!environmentConfig.SESSION_SECRET) {
  logger.warn('⚠️ [Security] SESSION_SECRET not set, using fallback. SET THIS FOR PRODUCTION!', undefined, 'SECURITY');
}

// CORS configuration for production
import cors from 'cors';

const allowedOrigins = (environmentConfig.CORS_ORIGIN || 'https://app.planyourperfectday.app,http://localhost:5173').split(',');

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // For development, allow requests with no origin (like mobile apps or curl requests)
    if (!origin && environmentConfig.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    if (origin && allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`[CORS] Blocked request from origin: ${origin}`, undefined, 'API');
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with']
};

app.use(cors(corsOptions));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(session(createSessionConfig()));
app.use(performanceMiddleware());
app.use(requestLogger);
app.use('/api', apiLimiter);

// Register routes
const cityConfigService = new CityConfigService();
const locationResolver = new LocationResolver();
const planningService = new ItineraryPlanningService(storage, cityConfigService, locationResolver);

app.use('/api/auth', authRoutes);
app.use('/api/collaboration', collaborationRoutes);
app.use('/api/export', exportRoutes);
registerRoutes(app, planningService, cityConfigService);

// Vercel handles serving static files and the frontend, so vite middleware is removed.

// Global error handler - MUST be after all other middleware and routes
app.use(globalErrorHandler);

// Initialize database connection on startup
testDatabaseConnection().catch(error => {
  logger.error('❌ [Startup] Failed to initialize database connection:', error, 'STARTUP');
  // In serverless, this will prevent the function from starting
  throw error;
});

logger.info('🚀 [Startup] API server initialized successfully', undefined, 'STARTUP');

// Export the app for Vercel
export default app;