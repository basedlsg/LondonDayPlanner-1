// Server Entry Point
// Express server for the London Day Planner API

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { planRoutes } from './routes/index.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: true,
  credentials: false,
}));

app.use(express.json());

// Request logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });
}

// Mount API routes
app.use('/api', planRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message,
  });
});

// Start server only if not running in Vercel (serverless)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`
  ==============================================
    London Day Planner API Server
  ==============================================
    Environment: ${process.env.NODE_ENV || 'development'}
    Port: ${PORT}

    Endpoints:
      POST /api/plan          - Create itinerary
      POST /api/:city/plan    - Create city-specific itinerary
      GET  /api/health        - Health check
      GET  /api/cities        - List supported cities
  ==============================================
  `);
  });
}

export default app;
