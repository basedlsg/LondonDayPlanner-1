// Plan API Routes
// Handles itinerary planning requests

import { Router, Request, Response } from 'express';
import { ItineraryPlanner, getItineraryPlanner } from '../services/ItineraryPlanner.js';
import { getConfig } from '../config/index.js';
import { getAllCities, getCityConfig } from '../config/cities.js';
import { Itinerary, PlanRequest } from '../types/index.js';

const router = Router();

interface PhotoMediaResponse {
  photoUri?: string;
}

/**
 * POST /api/plan
 * Create an itinerary for a generic request (uses city from body or defaults to london)
 */
router.post('/plan', async (req: Request, res: Response) => {
  const startProcessingTime = Date.now();
  try {
    const {
      date,
      startTime,
      query,
      weatherAware,
      isPremium,
      city = 'london'
    } = req.body as PlanRequest & { city?: string, isPremium?: boolean };

    // Validate required fields
    if (!query) {
      return res.status(400).json({
        error: 'Missing required field: query',
        message: 'Please provide a plans/query field with your itinerary request',
      });
    }

    console.log(`[/api/plan] Received request for city: ${city}`);
    console.log(`[/api/plan] Query: ${query}`);

    const cityConfig = getCityConfig(city);
    const planner = getItineraryPlanner();

    const request: PlanRequest = {
      date: date || new Date().toISOString().split('T')[0],
      startTime: startTime || new Date().toTimeString().slice(0, 5),
      query,
      weatherAware,
      isPremium: req.body.isPremium,
    };

    const itinerary = await planner.createPlan(request, cityConfig);

    // Wrap response in CreateItineraryResponse format for iOS compatibility
    res.json({
      itinerary: withAbsoluteAssetUrls(req, itinerary),
      processingTimeMs: Date.now() - startProcessingTime,
    });
  } catch (error) {
    console.error('[/api/plan] Error:', error);
    res.status(500).json({
      error: 'Failed to create itinerary',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/:city/plan
 * Create an itinerary for a specific city
 */
router.post('/:city/plan', async (req: Request, res: Response) => {
  const startProcessingTime = Date.now();
  try {
    const { city } = req.params;
    const { date, startTime, query, weatherAware, isPremium } = req.body;

    // Default to "surprise me" if no query provided
    const planQuery = query || `Best of ${city} - surprise me with a great day out`;

    console.log(`[/api/${city}/plan] Received request`);
    console.log(`[/api/${city}/plan] Query: ${planQuery}`);

    const cityConfig = getCityConfig(city);
    const planner = getItineraryPlanner();

    const request: PlanRequest = {
      date: date || new Date().toISOString().split('T')[0],
      startTime: startTime || new Date().toTimeString().slice(0, 5),
      query: planQuery,
      weatherAware,
      isPremium,
    };

    const itinerary = await planner.createPlan(request, cityConfig);

    // Wrap response in CreateItineraryResponse format for iOS compatibility
    res.json({
      itinerary: withAbsoluteAssetUrls(req, itinerary),
      processingTimeMs: Date.now() - startProcessingTime,
    });
  } catch (error) {
    console.error(`[/api/:city/plan] Error:`, error);
    res.status(500).json({
      error: 'Failed to create itinerary',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'london-day-planner',
  });
});

/**
 * GET /api/place-photo
 * Resolve a Google Places photo name to a short-lived hosted URL without exposing the API key.
 */
router.get('/place-photo', async (req: Request, res: Response) => {
  const name = typeof req.query.name === 'string' ? req.query.name : '';
  const maxWidthPx = clampImageSize(req.query.maxWidthPx);

  if (!name.startsWith('places/')) {
    return res.status(400).json({
      error: 'Invalid photo name',
      message: 'Expected a Places photo resource name.',
    });
  }

  try {
    const encodedName = name
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');

    const photoEndpoint = new URL(`https://places.googleapis.com/v1/${encodedName}/media`);
    photoEndpoint.searchParams.set('maxWidthPx', String(maxWidthPx));
    photoEndpoint.searchParams.set('skipHttpRedirect', 'true');

    const response = await fetch(photoEndpoint, {
      headers: {
        'X-Goog-Api-Key': getConfig().placesApiKey,
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Failed to resolve photo',
        message: await response.text(),
      });
    }

    const data = (await response.json()) as PhotoMediaResponse;
    if (!data.photoUri) {
      return res.status(404).json({
        error: 'Photo unavailable',
        message: 'No hosted photo URL was returned for this venue.',
      });
    }

    res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    return res.redirect(data.photoUri);
  } catch (error) {
    console.error('[/api/place-photo] Error:', error);
    return res.status(500).json({
      error: 'Failed to resolve photo',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/cities
 * Get list of supported cities
 */
router.get('/cities', (req: Request, res: Response) => {
  const cities = getAllCities();
  res.json(cities.map((c: any) => ({
    name: c.name,
    slug: c.slug,
    country: c.country,
  })));
});

export default router;

function withAbsoluteAssetUrls(req: Request, itinerary: Itinerary): Itinerary {
  const baseUrl = getRequestOrigin(req);

  return {
    ...itinerary,
    venues: itinerary.venues.map((venue) => ({
      ...venue,
      photoUrl: absolutizeMaybeRelative(baseUrl, venue.photoUrl),
      alternatives: venue.alternatives?.map((alternative) => ({
        ...alternative,
        photoUrl: absolutizeMaybeRelative(baseUrl, alternative.photoUrl),
      })),
    })),
  };
}

function absolutizeMaybeRelative(baseUrl: string, value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  return value.startsWith('http') ? value : new URL(value, baseUrl).toString();
}

function getRequestOrigin(req: Request): string {
  const forwardedProto = req.header('x-forwarded-proto')?.split(',')[0];
  const forwardedHost = req.header('x-forwarded-host')?.split(',')[0];
  const protocol = forwardedProto || req.protocol;
  const host = forwardedHost || req.get('host') || 'london-day-planner-1.vercel.app';
  return `${protocol}://${host}`;
}

function clampImageSize(rawValue: unknown): number {
  const parsed = Number.parseInt(String(rawValue ?? '1200'), 10);
  if (Number.isNaN(parsed)) {
    return 1200;
  }

  return Math.max(200, Math.min(parsed, 1600));
}
