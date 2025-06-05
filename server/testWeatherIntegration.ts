/**
 * Test the weather integration with the itinerary planning service
 */
import { getWeatherForecast, isVenueOutdoor, isWeatherSuitableForOutdoor } from './lib/weatherService';

async function testWeatherIntegration() {
  console.log('🌤️ Testing Weather Integration\n');

  // Test 1: Weather service functionality
  console.log('--- Test 1: Basic Weather Service ---');
  try {
    // Test with NYC coordinates
    const nycLat = 40.7128;
    const nycLng = -74.0060;
    
    console.log(`Fetching weather for NYC (${nycLat}, ${nycLng})...`);
    const weather = await getWeatherForecast(nycLat, nycLng);
    
    console.log('✅ Weather data retrieved successfully');
    console.log(`📊 Found ${weather.list?.length || 0} forecast entries`);
    
    if (weather.list && weather.list.length > 0) {
      const current = weather.list[0];
      console.log(`🌡️ Current conditions: ${current.weather[0].main} - ${current.main.temp}°C`);
      console.log(`💧 Humidity: ${current.main.humidity}%`);
    }
  } catch (error) {
    console.error('❌ Weather service test failed:', error.message);
    if (error.message.includes('Weather API feature is disabled')) {
      console.log('💡 Make sure WEATHER_API_KEY is set in your environment');
    }
  }

  // Test 2: Venue classification
  console.log('\n--- Test 2: Venue Classification ---');
  const testVenues = [
    { name: 'Central Park', types: ['park', 'tourist_attraction'] },
    { name: 'Metropolitan Museum', types: ['museum', 'tourist_attraction'] },
    { name: 'Times Square', types: ['tourist_attraction', 'point_of_interest'] },
    { name: 'Joe\'s Coffee', types: ['cafe', 'food', 'establishment'] },
    { name: 'Brooklyn Bridge', types: ['tourist_attraction', 'point_of_interest'] },
    { name: 'Madison Square Garden', types: ['stadium', 'establishment'] }
  ];

  testVenues.forEach(venue => {
    const isOutdoor = isVenueOutdoor(venue.types);
    console.log(`${isOutdoor ? '🌳' : '🏢'} ${venue.name} → ${isOutdoor ? 'Outdoor' : 'Indoor'}`);
  });

  // Test 3: Weather suitability check
  console.log('\n--- Test 3: Weather Suitability ---');
  
  // Mock weather data for testing
  const mockWeatherData = {
    list: [
      {
        dt: Math.floor(Date.now() / 1000),
        main: { temp: 22, feels_like: 24, humidity: 60 },
        weather: [{ main: 'Clear', description: 'clear sky', icon: '01d' }]
      },
      {
        dt: Math.floor(Date.now() / 1000) + 3600,
        main: { temp: 18, feels_like: 16, humidity: 80 },
        weather: [{ main: 'Rain', description: 'light rain', icon: '10d' }]
      },
      {
        dt: Math.floor(Date.now() / 1000) + 7200,
        main: { temp: 35, feels_like: 38, humidity: 45 },
        weather: [{ main: 'Clear', description: 'clear sky', icon: '01d' }]
      }
    ]
  };

  const testTimes = [
    { time: new Date(), condition: 'Clear 22°C' },
    { time: new Date(Date.now() + 3600 * 1000), condition: 'Rainy 18°C' },
    { time: new Date(Date.now() + 7200 * 1000), condition: 'Hot 35°C' }
  ];

  testTimes.forEach((test, index) => {
    const suitable = isWeatherSuitableForOutdoor(mockWeatherData, test.time);
    console.log(`${suitable ? '✅' : '⚠️'} ${test.condition} → ${suitable ? 'Suitable' : 'Not suitable'} for outdoor activities`);
  });

  // Test 4: Integration with venue data
  console.log('\n--- Test 4: Venue Weather Integration ---');
  
  const mockVenues = [
    {
      name: 'Central Park Conservatory Garden',
      types: ['park', 'tourist_attraction'],
      location: { lat: 40.7829, lng: -73.9654 },
      scheduledTime: new Date().toISOString()
    },
    {
      name: 'Museum of Modern Art',
      types: ['museum', 'art_gallery'],
      location: { lat: 40.7614, lng: -73.9776 },
      scheduledTime: new Date(Date.now() + 3600 * 1000).toISOString()
    }
  ];

  mockVenues.forEach(venue => {
    const isOutdoor = isVenueOutdoor(venue.types);
    console.log(`\n🏛️ ${venue.name}`);
    console.log(`   Type: ${isOutdoor ? 'Outdoor' : 'Indoor'}`);
    console.log(`   Scheduled: ${new Date(venue.scheduledTime).toLocaleTimeString()}`);
    
    if (isOutdoor) {
      console.log(`   🌤️ Weather check recommended for outdoor venue`);
    } else {
      console.log(`   🏢 Indoor venue - weather independent`);
    }
  });

  console.log('\n🎉 Weather integration test completed!');
  console.log('\n💡 Next steps:');
  console.log('   1. Set WEATHER_API_KEY environment variable');
  console.log('   2. Test with real itinerary creation');
  console.log('   3. Verify weather display in frontend');
}

// Run the test
testWeatherIntegration().catch(console.error);