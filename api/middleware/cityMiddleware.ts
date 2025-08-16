// @ts-nocheck
import { Request, Response, NextFunction } from 'express';
import { getCityConfig, getAllCitySlugs, CityConfig } from '../config/cities';
import { NotFoundError, ValidationError, InternalServerError } from '../lib/errors';

// Extend Express Request type to include cityConfig
declare global {
  namespace Express {
    interface Request {
      cityConfig?: CityConfig;
    }
  }
}

/**
 * Middleware to validate the city slug from URL parameters.
 * Throws a ValidationError if the slug is invalid.
 */
export function validateCitySlugParams(req: Request, res: Response, next: NextFunction) {
  const citySlug = req.params.city;
  if (!citySlug) {
    // This case should ideally be caught by a route not matching if :city is mandatory
    return next(new ValidationError('City slug is missing in URL parameters.'));
  }
  const cityConfig = getCityConfig(citySlug);
  if (!cityConfig) {
    return next(new ValidationError(`Invalid city slug: '${citySlug}'. Supported cities: ${getAllCitySlugs().join(', ')}.`));
  }
  // If valid, proceed. CityConfig can be attached in a subsequent middleware if needed.
  next();
}

/**
 * Middleware to attach city configuration to the request object (req.cityConfig).
 * Assumes city slug is present in req.params.city and is valid (e.g., run after validateCitySlugParams).
 * Throws a NotFoundError if the city configuration cannot be loaded (should be rare if validated before).
 */
export function attachCityConfig(req: Request, res: Response, next: NextFunction) {
  const citySlug = req.params.city;
  if (!citySlug) {
    // Should have been caught by routing or validateCitySlugParams
    return next(new InternalServerError('City slug missing for attachCityConfig middleware.'));
  }
  const cityConfig = getCityConfig(citySlug);
  if (!cityConfig) {
    // Should also have been caught, but as a safeguard:
    return next(new NotFoundError(`Configuration for city '${citySlug}' not found.`));
  }
  req.cityConfig = cityConfig;
  next();
}

// cityErrorHandler might not be needed if global error handler catches AppError instances correctly.
// If specific formatting for city errors is needed, it could be implemented here.
// export function cityErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
//   if (err instanceof CitySpecificError) { // Example: define CitySpecificError extending AppError
//     return res.status(err.statusCode).json({ message: err.message, city: req.params.city });
//   }
//   next(err);
// } 