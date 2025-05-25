import type { Request, Response, NextFunction } from 'express';
import { storage } from '../storage'; // Assuming storage uses getDb() for deferred DB init

// Extend Express Request type to include currentUser
declare global {
  namespace Express {
    interface Request {
      currentUser?: any; // Consider defining a proper User type here from shared/schema
    }
  }
}

/**
 * Middleware to require authentication for protected routes
 * If user is not authenticated, redirects to login or returns 401
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  // Check for Accept header to ensure proper response
  const acceptHeader = req.get('Accept');
  const wantsJSON = acceptHeader && acceptHeader.includes('application/json');
  
  if (!req.session || !req.session.userId) {
    if (wantsJSON) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'You must be logged in to access this resource'
      });
    } else {
      return res.redirect('/login');
    }
  }
  
  next();
};

/**
 * Middleware to attach the current user to the request
 * This does not block the request if user is not authenticated
 */
export async function attachCurrentUser(req: Request, res: Response, next: NextFunction) {
  try {
    // console.log('🔐 [attachCurrentUser] Session check:', {
    //   hasSession: !!req.session,
    //   sessionId: req.session?.id,
    //   userId: req.session?.userId
    // });
    
    req.currentUser = undefined; // Clear any existing user data from previous middleware runs (if any)
    
    if (!req.session?.userId) {
      // console.log('🔐 [attachCurrentUser] No user ID in session');
      return next();
    }
    
    const userId = req.session.userId;
    
    if (userId === 'dev-user-123' || userId === 'test-user') { // Added 'test-user' as another potential mock
      console.log('🔐 [attachCurrentUser] Using development mock user:', userId);
      req.currentUser = {
        id: userId,
        email: `${userId}@example.com`,
        name: 'Development User',
        avatar_url: null
        // Add other fields to match your User type from shared/schema if needed
      };
      return next();
    }
    
    try {
      // console.log('🔐 [attachCurrentUser] Fetching user from database:', userId);
      const user = await storage.getUserById(userId);
      
      if (user) {
        // console.log('🔐 [attachCurrentUser] User found:', user.email);
        // Ensure the structure assigned to req.currentUser matches your User type for consistency
        req.currentUser = user; 
      } else {
        console.warn('🔐 [attachCurrentUser] User not found in database for ID:', userId, '. Clearing session userId.');
        if(req.session) req.session.userId = undefined; // Clear invalid userId from session
      }
    } catch (dbError: any) {
      console.error('🔐 [attachCurrentUser] Database error when fetching user:', userId, dbError.message);
      if (dbError.message?.includes('invalid input syntax for type uuid')) {
        console.warn('🔐 [attachCurrentUser] Invalid UUID format in session, clearing session userId.');
        if(req.session) req.session.userId = undefined;
      }
      // Don't fail the request, just continue without user
    }
    next();
  } catch (error: any) {
    console.error('🔐 [attachCurrentUser] Unhandled middleware error:', error);
    req.currentUser = undefined; // Ensure currentUser is cleared on error
    next(); // Ensure next is always called
  }
}

// Auth status route handler creator (as provided by user)
export function createAuthStatusHandler() {
  return (req: Request, res: Response) => {
    try {
      // console.log('🔐 [authStatus] Checking auth status:', {
      //   hasCurrentUser: !!req.currentUser,
      //   sessionUserId: req.session?.userId,
      //   userEmail: req.currentUser?.email
      // });
      
      if (req.currentUser) {
        res.json({
          isAuthenticated: true,
          user: {
            id: req.currentUser.id,
            email: req.currentUser.email,
            name: req.currentUser.name,
            avatar_url: req.currentUser.avatar_url
            // Ensure this matches the structure client expects
          }
        });
      } else {
        res.json({
          isAuthenticated: false,
          user: null
        });
      }
    } catch (error: any) {
      console.error('🔐 [authStatus] Error in auth status handler:', error);
      res.status(500).json({
        isAuthenticated: false,
        user: null,
        error: 'Failed to determine authentication status'
      });
    }
  };
}