console.log(`[rateLimiter.ts CHECK] NODE_ENV is: ${process.env.NODE_ENV} at module load`);

import rateLimit from 'express-rate-limit';
import { logger } from './logging';

// Augment express-serve-static-core.Request for express-rate-limit
declare module 'express-serve-static-core' {
  interface Request {
    rateLimit?: {
      limit: number;
      current: number;
      remaining: number;
      resetTime?: Date; // The time when the rate limit will reset, as a Date object
    };
  }
}

// General API rate limiting
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Actual limit for production
  skip: (req, res) => process.env.NODE_ENV === 'development', // Skip rate limiting in development
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url
    }, 'RATE_LIMIT');
    
    const windowMs = 15 * 60 * 1000; // Matching apiLimiter's windowMs
    const retryAfterSeconds = (req.rateLimit && req.rateLimit.resetTime)
      ? Math.ceil((req.rateLimit.resetTime.getTime() - Date.now()) / 1000)
      : Math.ceil(windowMs / 1000);

    res.status(429).json({
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retryAfter: retryAfterSeconds
    });
  }
});

// Stricter rate limiting for resource-intensive endpoints like planning
export const planningLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // limit each IP to 5 planning requests per minute
  message: {
    error: 'Too many planning requests from this IP, please slow down.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Planning rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url
    }, 'RATE_LIMIT');
    
    const windowMs = 60 * 1000; // Matching planningLimiter's windowMs
    const retryAfterSeconds = (req.rateLimit && req.rateLimit.resetTime)
      ? Math.ceil((req.rateLimit.resetTime.getTime() - Date.now()) / 1000)
      : Math.ceil(windowMs / 1000);

    res.status(429).json({
      error: 'Too many planning requests',
      message: 'You are making too many itinerary requests. Please wait before trying again.',
      retryAfter: retryAfterSeconds
    });
  }
});

// Auth rate limiting to prevent brute force attacks
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Actual limit for production
  skip: (req, res) => process.env.NODE_ENV === 'development', // Skip rate limiting in development
  message: {
    error: 'Too many authentication attempts from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url
    }, 'RATE_LIMIT');
    
    const windowMs = 15 * 60 * 1000; // Matching authLimiter's windowMs
    const retryAfterSeconds = (req.rateLimit && req.rateLimit.resetTime)
      ? Math.ceil((req.rateLimit.resetTime.getTime() - Date.now()) / 1000)
      : Math.ceil(windowMs / 1000);

    res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'Too many failed login attempts. Please try again later.',
      retryAfter: retryAfterSeconds
    });
  }
});

// Very permissive rate limiting for static content and health checks
export const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Very high limit for public endpoints
  standardHeaders: false,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks and other monitoring
    return req.url === '/health' || req.url === '/api/health';
  }
});

// Helper to create custom rate limiters
export function createCustomLimiter(windowMs: number, max: number, message?: string) {
  return rateLimit({
    windowMs,
    max,
    message: message || 'Rate limit exceeded',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Custom rate limit exceeded', {
        ip: req.ip,
        url: req.url,
        windowMs,
        max
      }, 'RATE_LIMIT');
      
      const currentWindowMs = windowMs; // Use the passed windowMs
      const retryAfterSeconds = (req.rateLimit && req.rateLimit.resetTime)
        ? Math.ceil((req.rateLimit.resetTime.getTime() - Date.now()) / 1000)
        : Math.ceil(currentWindowMs / 1000);

      res.status(429).json({
        error: 'Rate limit exceeded',
        message: message || 'You have exceeded the rate limit for this endpoint.',
        retryAfter: retryAfterSeconds
      });
    }
  });
}