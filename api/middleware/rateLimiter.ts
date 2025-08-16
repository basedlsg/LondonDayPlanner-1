// @ts-nocheck
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}

interface RateLimitStore {
  hits: number;
  resetTime: number;
}

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map<string, RateLimitStore>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

export function createRateLimiter(options: RateLimitOptions) {
  const {
    windowMs,
    max,
    message = 'Too many requests, please try again later.',
    skipSuccessfulRequests = false,
    skipFailedRequests = true,
    keyGenerator = (req: Request) => req.ip || 'unknown'
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();
    
    // Get or create rate limit data for this key
    let limitData = rateLimitStore.get(key);
    
    if (!limitData || limitData.resetTime < now) {
      // Create new window
      limitData = {
        hits: 0,
        resetTime: now + windowMs
      };
      rateLimitStore.set(key, limitData);
    }
    
    // Check if limit exceeded
    if (limitData.hits >= max) {
      const retryAfter = Math.ceil((limitData.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());
      res.setHeader('X-RateLimit-Limit', max.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', new Date(limitData.resetTime).toISOString());
      
      return next(new AppError(message, 429));
    }
    
    // Set rate limit headers BEFORE incrementing
    res.setHeader('X-RateLimit-Limit', max.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - limitData.hits - 1).toString());
    res.setHeader('X-RateLimit-Reset', new Date(limitData.resetTime).toISOString());
    
    // Increment hit count
    limitData.hits++;
    
    // Handle response to potentially skip counting this request
    if (skipSuccessfulRequests || skipFailedRequests) {
      const originalSend = res.send;
      res.send = function(data: any) {
        const shouldSkip = (res.statusCode < 400 && skipSuccessfulRequests) ||
                          (res.statusCode >= 400 && skipFailedRequests);
        
        if (shouldSkip && limitData) {
          limitData.hits--;
        }
        
        return originalSend.call(this, data);
      };
    }
    
    next();
  };
}

// Pre-configured rate limiters for different endpoints
export const rateLimiters = {
  // General API rate limit: 100 requests per 15 minutes
  general: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again after 15 minutes'
  }),
  
  // Strict rate limit for expensive operations: 20 requests per hour
  expensive: createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 20,
    message: 'Too many planning requests, please try again after an hour'
  }),
  
  // Auth endpoints: 5 attempts per 15 minutes
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many authentication attempts, please try again later',
    skipSuccessfulRequests: true
  }),
  
  // Public endpoints: 200 requests per hour
  public: createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 200,
    message: 'API rate limit exceeded'
  })
};

// Rate limiter specifically for itinerary planning
export const planningRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 requests per 5 minutes
  message: 'Too many planning requests. Please wait a few minutes before trying again.',
  keyGenerator: (req: Request) => {
    // Rate limit by IP + user agent to prevent abuse
    const ip = req.ip || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';
    return `${ip}:${userAgent}`;
  }
});