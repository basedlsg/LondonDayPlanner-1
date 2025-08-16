// @ts-nocheck
import session from 'express-session';
import { logger } from './logging';

export interface SessionConfig {
  secret: string;
  resave: boolean;
  saveUninitialized: boolean;
  cookie: {
    secure: boolean;
    httpOnly: boolean;
    maxAge: number;
    sameSite: 'strict' | 'lax' | 'none';
  };
  name: string;
}

export function createSessionConfig(): SessionConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  const secret = getSessionSecret();
  
  const config: SessionConfig = {
    secret,
    resave: false,
    saveUninitialized: false,
    name: 'london.planner.sid', // Custom session name for security
    cookie: {
      secure: isProduction, // HTTPS only in production
      httpOnly: true, // Prevent XSS attacks
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: isProduction ? 'strict' : 'lax' // CSRF protection
    }
  };

  logger.info('Session configuration created', {
    isProduction,
    hasSecret: !!secret,
    cookieSecure: config.cookie.secure,
    sameSite: config.cookie.sameSite
  }, 'SESSION');

  return config;
}

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.SECRET_KEY;
  
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      // Generate a fallback secret for production if none provided
      const fallbackSecret = 'railway-fallback-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      logger.warn('No SESSION_SECRET found in production, using generated fallback', {}, 'SESSION');
      return fallbackSecret;
    }
    
    logger.warn('No SESSION_SECRET found, using development fallback', {}, 'SESSION');
    return 'development-fallback-secret-please-change-for-production';
  }

  // Validate secret strength
  if (secret.length < 32) {
    logger.warn('SESSION_SECRET is shorter than recommended (32 characters)', {
      length: secret.length
    }, 'SESSION');
  }

  return secret;
}

// Session store configuration for production
export function configureSessionStore() {
  // TODO: Add database session store for production
  // This would use connect-pg-simple or similar for PostgreSQL
  if (process.env.NODE_ENV === 'production') {
    logger.warn('Using memory session store in production - consider using database store', {}, 'SESSION');
  }
  
  return undefined; // Return memory store for now
}