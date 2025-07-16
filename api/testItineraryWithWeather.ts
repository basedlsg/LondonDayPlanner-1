import { setupEnvironment } from './lib/environment.js';
import { getWeatherForecast, getWeatherAwareVenue } from './lib/weatherService.js';

async function testItineraryWeatherIntegration() {
  console.log('🧪 Testing Itinerary Weather Integration...\n');
  
  setupEnvironment();
  
  // Sample venue data (simulate PlaceDetails)
  const sampleVenue = {
    place_id: 'ChIJGT3m3k4fGkgR2wD0ks8JLBM',
    name: 'Hyde Park',
    formatted_address: 'London W2, UK',
    geometry: {
      location: {
        lat: 51.5074,
        lng: -0.1278
      }
    },
    types: ['park', 'tourist_attraction'],
    rating: 4.5
  };
  
  try {
    console.log('1. Testing weather forecast for London...');
    const weather = await getWeatherForecast(51.5074, -0.1278);
    console.log(`   Weather: ${weather.temperature}°C, ${weather.condition} - ${weather.description}`);
    console.log(`   Suitable for outdoor: ${weather.suitable ? '✅' : '❌'}\n`);
    
    console.log('2. Testing weather-aware venue recommendation...');
    const venueTime = new Date();
    const weatherAwareResult = await getWeatherAwareVenue(sampleVenue, venueTime);
    
    if (weatherAwareResult) {
      console.log(`   Venue: ${sampleVenue.name}`);
      console.log(`   Is outdoor venue: ${weatherAwareResult.isOutdoor ? '✅' : '❌'}`);
      console.log(`   Weather suitable: ${weatherAwareResult.suitable ? '✅' : '❌'}`);
      console.log(`   Temperature: ${weatherAwareResult.temperature}°C`);
      console.log(`   Conditions: ${weatherAwareResult.condition} - ${weatherAwareResult.description}`);
    } else {
      console.log('   ❌ Failed to get weather-aware venue data');
    }
    
    console.log('\n✅ Weather integration test completed successfully!');
    
  } catch (error) {
    console.error('❌ Weather integration test failed:', error);
  }
}

testItineraryWeatherIntegration();