// Simplified NLP processing for Firebase Functions
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function parseItineraryRequest(query, date, startTime) {
  try {
    console.log('Processing request:', { query, date, startTime });

    // Simple pattern matching for common requests
    const patterns = {
      lunch: /lunch|eat|dinner|food|restaurant/i,
      coffee: /coffee|cafe|tea/i,
      visit: /visit|see|tour|explore/i,
      shopping: /shop|store|mall/i,
      park: /park|outdoor|nature/i,
      bar: /bar|drink|pub/i
    };

    let activity = 'Visit';
    let location = query;
    let type = 'tourist_attraction';

    // Detect activity type
    if (patterns.lunch.test(query)) {
      activity = 'Lunch';
      type = 'restaurant';
    } else if (patterns.coffee.test(query)) {
      activity = 'Coffee';
      type = 'cafe';
    } else if (patterns.park.test(query)) {
      activity = 'Visit Park';
      type = 'park';
    } else if (patterns.bar.test(query)) {
      activity = 'Drinks';
      type = 'bar';
    } else if (patterns.shopping.test(query)) {
      activity = 'Shopping';
      type = 'shopping_mall';
    }

    // Extract location (simple heuristic)
    const locationPatterns = [
      /in\s+([^,]+)(?:,|\s|$)/i,
      /at\s+([^,]+)(?:,|\s|$)/i,
      /near\s+([^,]+)(?:,|\s|$)/i
    ];

    for (const pattern of locationPatterns) {
      const match = query.match(pattern);
      if (match) {
        location = match[1].trim();
        break;
      }
    }

    // Default to a reasonable start time if not provided
    const defaultStartTime = startTime || '12:00';

    return {
      startLocation: 'Midtown', // Default starting location
      destinations: [location],
      fixedTimes: [{
        location: location,
        time: defaultStartTime,
        type: type,
        searchTerm: activity,
        minRating: 4,
        displayTime: defaultStartTime
      }],
      preferences: {
        requirements: []
      }
    };

  } catch (error) {
    console.error('Error in parseItineraryRequest:', error);

    // Fallback: create a basic itinerary
    return {
      startLocation: 'Midtown',
      destinations: ['Central Park'],
      fixedTimes: [{
        location: 'Central Park',
        time: startTime || '12:00',
        type: 'park',
        searchTerm: 'Visit Central Park',
        minRating: 4,
        displayTime: startTime || '12:00'
      }],
      preferences: {
        requirements: []
      }
    };
  }
}

module.exports = { parseItineraryRequest };
