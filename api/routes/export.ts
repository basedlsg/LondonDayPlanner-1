import { Router } from 'express';
import { z } from 'zod';
import { PDFExportService } from '../services/PDFExportService';
import { storage } from '../storage';
import { CityConfigService } from '../services/CityConfigService';
import { AppError } from '../lib/errors';

const router = Router();
const pdfService = new PDFExportService();
const cityConfigService = new CityConfigService();

// Export itinerary as PDF
router.get('/itineraries/:id/pdf', async (req, res, next) => {
  try {
    const itineraryId = parseInt(req.params.id);
    
    // Parse query parameters
    const querySchema = z.object({
      includeMap: z.coerce.boolean().optional().default(true),
      includeWeather: z.coerce.boolean().optional().default(false),
      includeTransportation: z.coerce.boolean().optional().default(true),
      paperSize: z.enum(['A4', 'Letter']).optional().default('A4'),
      orientation: z.enum(['portrait', 'landscape']).optional().default('portrait'),
      city: z.string().optional()
    });

    const options = querySchema.parse(req.query);
    
    // Fetch itinerary with places
    const itinerary = await storage.getItinerary(itineraryId);
    if (!itinerary) {
      throw new AppError('Itinerary not found', 404);
    }

    // Get city config
    const cityConfig = options.city ? 
      cityConfigService.getCurrentCity(options.city) : 
      cityConfigService.getCurrentCity('nyc'); // Default to NYC

    // Ensure we have place details
    const placesWithDetails = itinerary.places.map(place => {
      if (!place.details || typeof place.details === 'string') {
        // If details are missing or just a string, create a minimal PlaceDetails object
        return {
          ...place,
          details: {
            name: place.name || 'Unknown Location',
            formatted_address: place.address || '',
            place_id: place.placeId || '',
            geometry: {
              location: {
                lat: place.latitude || 0,
                lng: place.longitude || 0
              }
            },
            rating: place.rating,
            types: []
          }
        };
      }
      return place;
    });

    const itineraryWithDetails = {
      ...itinerary,
      places: placesWithDetails
    };

    // Generate PDF
    const pdfBuffer = await pdfService.generateItineraryPDF(
      itineraryWithDetails as any,
      cityConfig,
      {
        includeMap: options.includeMap,
        includeWeather: options.includeWeather,
        includeTransportation: options.includeTransportation,
        paperSize: options.paperSize,
        orientation: options.orientation
      }
    );

    // Set response headers
    const filename = `${cityConfig.name}-itinerary-${itineraryId}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length.toString());
    
    // Send PDF as binary
    res.end(pdfBuffer, 'binary');
  } catch (error) {
    next(error);
  }
});

// Export trip (multi-day) as PDF
router.get('/trips/:id/pdf', async (req, res, next) => {
  try {
    const tripId = parseInt(req.params.id);
    
    // Parse query parameters
    const querySchema = z.object({
      includeMap: z.coerce.boolean().optional().default(true),
      includeWeather: z.coerce.boolean().optional().default(false),
      includeTransportation: z.coerce.boolean().optional().default(true),
      paperSize: z.enum(['A4', 'Letter']).optional().default('A4'),
      orientation: z.enum(['portrait', 'landscape']).optional().default('portrait'),
      city: z.string().optional()
    });

    const options = querySchema.parse(req.query);
    
    // Fetch trip with all days
    const trip = await storage.getTrip(tripId);
    if (!trip) {
      throw new AppError('Trip not found', 404);
    }

    const tripDays = await storage.getTripDays(tripId);
    
    // Get city config
    const cityConfig = options.city ? 
      cityConfigService.getCurrentCity(options.city) : 
      cityConfigService.getCurrentCity('nyc'); // Default to NYC

    // For now, we'll generate a PDF for the first day
    // TODO: Implement multi-day PDF generation
    if (tripDays.length > 0 && tripDays[0].itineraryId) {
      const itinerary = await storage.getItinerary(tripDays[0].itineraryId);
      if (itinerary) {
        const pdfBuffer = await pdfService.generateItineraryPDF(
          itinerary as any,
          cityConfig,
          options
        );

        const filename = `${cityConfig.name}-trip-${tripId}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', pdfBuffer.length.toString());
        
        res.send(pdfBuffer);
      } else {
        throw new AppError('Trip itinerary not found', 404);
      }
    } else {
      throw new AppError('Trip has no days', 400);
    }
  } catch (error) {
    next(error);
  }
});

export { router as exportRoutes };