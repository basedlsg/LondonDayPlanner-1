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
import session from 'express-session';
import { createServer } from 'http';
import { z } from 'zod'; // For error handling if needed

// Import database and storage (db.ts now defers initialization)
import { db, getDb } from './db'; // getDb ensures initialization
import { storage } from './storage';

// Import services and validation
import { ItineraryPlanningService, type PlanRequestOptions } from './services/ItineraryPlanningService';

// Import routes
import { registerRoutes } from './routes'; // This will need planningService
import authRoutes from './routes/auth'; // This should use the new error-resistant handler
// import configRoutes from './routes/config'; // Config routes might not be needed if config is simplified or bypassed
// import itinerariesRoutes from './routes/itineraries'; // These are likely part of registerRoutes

// Import middleware
import { attachCurrentUser } from './middleware/requireAuth'; // Uses the updated error-resistant version
import { setupVite, serveStatic } from './vite';
import { AppError, ValidationError } from "./lib/errors"; // For global error handler


const app = express();

// Test database connection
async function testDatabaseConnection() {
  try {
    console.log('🗄️  Testing database connection...');
    const currentDb = getDb(); // This will trigger initialization if not already done
    // @ts-ignore - Assuming execute is a valid method on your db instance from Drizzle/Neon
    await currentDb.execute('SELECT 1 as test');
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

app.use(session(sessionConfig));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(attachCurrentUser); // Use the updated error-resistant version

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`); // Using req.originalUrl
  });
  next();
});

// Routes
app.use('/api/auth', authRoutes); // Uses the updated error-resistant version
// app.use('/api/config', configRoutes); // Assuming configRoutes are not primary focus now
// app.use('/api/itineraries', itinerariesRoutes); // Assuming these are part of main registerRoutes

// Register main routes with planning service
const httpServer = createServer(app);
const planningService = new ItineraryPlanningService(storage); // storage uses getDb() which initializes db

// Main /api/plan route with direct error handling and logging
app.post("/api/plan", async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    console.log('📝 [/api/plan] Request received:', {
      query: req.body.query,
      date: req.body.date,
      startTime: req.body.startTime
    });
    
    const requestSchema = z.object({
      query: z.string().min(1, { message: "Query cannot be empty" }), // Added min length
      date: z.string().optional(),
      startTime: z.string().optional()
    });

    const validationResult = requestSchema.safeParse(req.body);
    if (!validationResult.success) {
      // console.log('❌ [/api/plan] Validation error:', validationResult.error.flatten());
      // Use ZodError instance for the global error handler to format it
      return next(validationResult.error); 
    }

    const { query, date, startTime } = validationResult.data;

    let userId = req.session?.userId;
    if (!userId && process.env.NODE_ENV === 'development') {
      console.log('🔓 [/api/plan] Development mode: using mock user id dev-user-123');
      userId = 'dev-user-123';
      if (req.session) {
        req.session.userId = userId;
      }
    }

    if (!userId) {
      // This should ideally be an AuthenticationError for the global handler
      return res.status(401).json({ message: 'Authentication required' }); 
    }

    const planOptions: PlanRequestOptions = {
      query,
      date,
      startTime,
      userId,
      enableGapFilling: false 
    };

    console.log('🚀 [/api/plan] Calling ItineraryPlanningService.createPlan with options:', planOptions);
    const itinerary = await planningService.createPlan(planOptions);
    
    console.log('✅ [/api/plan] Plan created successfully by service:', { id: itinerary.id, title: itinerary.title });
    res.json(itinerary);

  } catch (error: any) {
    console.error('❌ [/api/plan] Unhandled error in route handler:', error.name, error.message);
    next(error); // Pass to global error handler
  }
});

// Other main application routes (like those for specific itineraries, etc.)
// registerRoutes(app, planningService); // Pass planningService if routes need it
// For now, we'll assume /api/plan is the primary one. 
// If other routes from the old registerRoutes are needed, they'd be added here or via registerRoutes.

// Static file serving
app.use('/NYC', express.static('dist/public'));
app.use('/', express.static('dist/public'));

// Enhanced error handling (should be the LAST app.use call)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('🚨 Global Error Handler Caught:', { 
    name: err.name, 
    message: err.message, 
    statusCode: err.statusCode, 
    status: err.status, 
    isOperational: err.isOperational, 
    url: req.originalUrl, 
    method: req.method,
    // stack: err.stack?.split('\n').slice(0,3).join('\n') // Limit stack for brevity
  });
  
  if (err instanceof AppError) {
    const message = (process.env.NODE_ENV === 'production' && !err.isOperational) 
                    ? 'An unexpected internal server error occurred.'
                    : err.message;
    return res.status(err.statusCode).json({
      error: err.name,
      message: message,
      ...(err instanceof ValidationError && err.field && { field: err.field }),
    });
  }

  if (err instanceof z.ZodError) {
    return res.status(400).json({
      error: 'ValidationError',
      message: 'Invalid request data. Please check your input.',
      details: err.errors.map(e => ({ 
        path: e.path.join('.'), 
        message: e.message, 
        code: e.code 
      })),
    });
  }
  
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(status).json({ 
    error: err.name || 'InternalServerError', // Use err.name if available
    message,
    ...(process.env.NODE_ENV === 'development' && { 
      cause: err.cause?.message, 
      // stack: err.stack?.split('\n').slice(0, 5) 
    })
  });
});

// Start server
async function startServer() {
  try {
    await testDatabaseConnection();
    
    // If registerRoutes from ./routes.ts sets up more than just /api/plan, call it.
    // Ensure it's adapted to potentially receive planningService or that planningService is accessible.
    // For now, /api/plan is directly defined above. We might not need the old registerRoutes call.
    // await import('./routes').then(routesModule => {
    //     routesModule.registerRoutes(app, planningService);
    // });

    if (process.env.NODE_ENV === 'development') {
      await setupVite(app, httpServer);
    } else {
      serveStatic(app);
    }

    const port = process.env.PORT || 5001; // Keeping 5001 for now
    httpServer.listen({port, host: '0.0.0.0'}, () => {
      console.log(`🚀 Server running on http://localhost:${port}`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🗄️  Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured (check .env or platform secrets)'}`);
      console.log(`🔑 Google Places API Key: ${process.env.GOOGLE_PLACES_API_KEY ? 'Configured' : 'MISSING (check .env)'}`);
      console.log(`🔑 Gemini API Key: ${process.env.GEMINI_API_KEY ? 'Configured' : 'MISSING (check .env)'}`);

    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
