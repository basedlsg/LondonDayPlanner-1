import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

// Test the full flow
async function testFullFlow() {
  console.log('\n🚀 Testing Full Itinerary Flow...\n');

  // 1. Test direct API endpoint
  console.log('1️⃣ Testing API endpoint directly...');
  try {
    const response = await fetch('http://localhost:5001/api/nyc/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'Pizza in Brooklyn',
        date: '2025-05-25',
        startTime: '19:00'
      })
    });

    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (data.venues && data.venues.length > 0) {
      console.log('✅ Venues found:', data.venues.length);
      console.log('First venue:', data.venues[0].name);
    } else {
      console.log('❌ No venues in response');
    }
  } catch (error) {
    console.error('❌ API request failed:', error);
  }

  // 2. Test Google Places directly
  console.log('\n2️⃣ Testing Google Places API directly...');
  try {
    const { searchPlace } = await import('./server/lib/googlePlaces.js');
    const result = await searchPlace('pizza in Brooklyn', {
      type: 'restaurant',
      keywords: ['pizza']
    });
    
    console.log('Search result:', {
      primary: result.primary?.name,
      alternatives: result.alternatives?.length || 0
    });
  } catch (error) {
    console.error('❌ Google Places search failed:', error);
  }

  // 3. Test NLP processing
  console.log('\n3️⃣ Testing NLP processing...');
  try {
    const { parseItineraryRequest } = await import('./server/lib/nlp-fixed.js');
    const parsed = await parseItineraryRequest('Pizza in Brooklyn');
    console.log('Parsed request:', JSON.stringify(parsed, null, 2));
  } catch (error) {
    console.error('❌ NLP processing failed:', error);
  }

  // 4. Test Planning Service
  console.log('\n4️⃣ Testing Planning Service...');
  try {
    const { storage } = await import('./server/storage.js');
    const { CityConfigService } = await import('./server/services/CityConfigService.js');
    const { LocationResolver } = await import('./server/services/LocationResolver.js');
    const { ItineraryPlanningService } = await import('./server/services/ItineraryPlanningService.js');
    
    const cityConfigService = new CityConfigService();
    const locationResolver = new LocationResolver();
    const planningService = new ItineraryPlanningService(storage, cityConfigService, locationResolver);
    
    const cityConfig = cityConfigService.getCityConfigWithDetails('nyc');
    
    const itinerary = await planningService.createPlan({
      query: 'Pizza in Brooklyn',
      date: '2025-05-25',
      startTime: '19:00',
      userId: 'test-user',
      citySlug: 'nyc',
      enableGapFilling: false
    }, cityConfig);
    
    console.log('Itinerary created:', {
      id: itinerary.id,
      venues: itinerary.venues?.length || 0,
      places: itinerary.places?.length || 0
    });
    
    if (itinerary.places && itinerary.places.length > 0) {
      console.log('First place:', {
        name: itinerary.places[0].name,
        address: itinerary.places[0].address
      });
    }
  } catch (error) {
    console.error('❌ Planning service failed:', error);
  }
}

// Run the test
testFullFlow().catch(console.error);