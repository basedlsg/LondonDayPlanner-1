// Test the weather API
import { testWeatherAPI } from './server/lib/weatherService.js';

console.log('Testing weather API...');

testWeatherAPI().then(success => {
  if (success) {
    console.log('✅ Weather API is working!');
  } else {
    console.log('❌ Weather API failed - will use fallback');
  }
}).catch(error => {
  console.error('❌ Weather test error:', error);
  console.log('Will use fallback weather data');
});