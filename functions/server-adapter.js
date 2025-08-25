// Server adapter for Firebase Functions
// This wraps your existing server logic to work with Firebase Functions

const { searchPlace } = require('./lib/googlePlaces');
const { parseItineraryRequest } = require('./lib/nlp-simple');

// Simple in-memory storage for Firebase Functions
class FirebaseStorage {
  constructor() {
    this.places = new Map();
    this.itineraries = new Map();
    this.nextPlaceId = 1;
    this.nextItineraryId = 1;
  }

  async getPlace(placeId) {
    return this.places.get(placeId) || undefined;
  }

  async getPlaceByPlaceId(placeId) {
    return this.getPlace(placeId);
  }

  async createPlace(place) {
    const id = this.nextPlaceId++;
    const newPlace = { ...place, id };
    this.places.set(place.placeId, newPlace);
    return newPlace;
  }

  async createItinerary(itinerary) {
    const id = this.nextItineraryId++;
    const newItinerary = {
      ...itinerary,
      id,
      created: new Date()
    };
    this.itineraries.set(id, newItinerary);
    return newItinerary;
  }

  async getItinerary(id) {
    return this.itineraries.get(id) || undefined;
  }
}

// Storage instance
const storage = new FirebaseStorage();

// Server adapter class
class ServerAdapter {
  async handlePlanRequest(body) {
    try {
      const { query, date, startTime, weatherAware = true } = body;

      console.log('Processing plan request:', { query, date, startTime });

      // Parse the request using your existing NLP
      const parsedRequest = await parseItineraryRequest(query, date, startTime);

      console.log('Parsed request:', parsedRequest);

      // Process the itinerary
      const itinerary = await this.processItinerary(parsedRequest, weatherAware);

      return {
        query,
        places: itinerary.places,
        travelTimes: itinerary.travelTimes || [],
        id: itinerary.id,
        created: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error in handlePlanRequest:', error);
      throw error;
    }
  }

  async processItinerary(parsedRequest, weatherAware) {
    try {
      const { startLocation, destinations, fixedTimes } = parsedRequest;

      console.log('Processing itinerary with:', { startLocation, destinations, fixedTimes });

      // Process each fixed time entry
      const places = [];
      const travelTimes = [];

      for (const fixedTime of fixedTimes) {
        console.log('Processing fixed time:', fixedTime);

        // Search for venues
        const searchResults = await searchPlace(
          `${fixedTime.searchTerm} in ${fixedTime.location}`,
          {
            type: fixedTime.type,
            requireOpenNow: true,
            minRating: fixedTime.minRating || 4
          }
        );

        if (searchResults.venues && searchResults.venues.length > 0) {
          const primaryVenue = searchResults.venues[0];

          // Create place record
          const place = await storage.createPlace({
            name: primaryVenue.name,
            address: primaryVenue.address,
            placeId: primaryVenue.placeId,
            scheduledTime: fixedTime.time,
            alternatives: searchResults.venues.slice(1, 4).map(v => v.placeId)
          });

          places.push({
            placeId: place.placeId,
            name: place.name,
            address: place.address,
            location: primaryVenue.location,
            details: primaryVenue.details || {},
            scheduledTime: fixedTime.time,
            id: place.id
          });
        }
      }

      // Create itinerary record
      const itinerary = await storage.createItinerary({
        startLocation,
        destinations,
        places: places.map(p => p.placeId),
        created: new Date()
      });

      return {
        ...itinerary,
        places,
        travelTimes
      };

    } catch (error) {
      console.error('Error in processItinerary:', error);
      throw error;
    }
  }
}

// Create and export server instance
function createServer() {
  return new ServerAdapter();
}

module.exports = { createServer, ServerAdapter };
