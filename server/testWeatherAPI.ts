import { testWeatherAPI, getWeatherForecast } from './lib/weatherService.js';
import { setupEnvironment } from './lib/environment.js';

async function testWeather() {
  console.log('🌤️  Testing Weather API Integration...\n');
  
  // Setup environment first
  setupEnvironment();
  
  try {
    // Test basic weather API
    console.log('1. Testing basic weather API functionality...');
    const isWorking = await testWeatherAPI();
    console.log(`   API Test Result: ${isWorking ? '✅ PASS' : '❌ FAIL'}\n`);
    
    if (isWorking) {
      // Test specific cities
      const testCities = [
        { name: 'NYC', lat: 40.7128, lng: -74.0060 },
        { name: 'London', lat: 51.5074, lng: -0.1278 },
        { name: 'Boston', lat: 42.3601, lng: -71.0589 },
        { name: 'Austin', lat: 30.2672, lng: -97.7431 }
      ];
      
      console.log('2. Testing weather for supported cities...');
      for (const city of testCities) {
        try {
          const weather = await getWeatherForecast(city.lat, city.lng);
          console.log(`   ${city.name}: ${weather.temperature}°C, ${weather.condition} - ${weather.description}`);
        } catch (error) {
          console.error(`   ${city.name}: ❌ Failed -`, error);
        }
      }
    }
    
    console.log('\n✅ Weather API test completed!');
  } catch (error) {
    console.error('❌ Weather API test failed:', error);
  }
}

testWeather();