// Plan API Routes
// Handles itinerary planning requests

import { Router, Request, Response } from 'express';
import { ItineraryPlanner, getItineraryPlanner } from '../services/ItineraryPlanner.js';
import { getAllCities, getCityConfig } from '../config/cities.js';
import { PlanRequest } from '../types/index.js';

const router = Router();

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
      itinerary,
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
      itinerary,
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
