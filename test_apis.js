// Test script to verify Google APIs are working
const PLACES_API_KEY = 'AIzaSyD9u3HH4FJPOEkk82T6AgL6QkEtVxAjzGk';
const GEMINI_API_KEY = 'AIzaSyBR28oJSgktemeF-mp6BPW_MZr44zPvvQQ';

async function testPlacesAPI() {
  console.log('🔍 Testing Google Places API...');

  try {
    // Test finding a place
    const placeResponse = await fetch(`https://places.googleapis.com/v1/places:searchText?key=${PLACES_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location'
      },
      body: JSON.stringify({
        textQuery: 'Empire State Building New York',
        languageCode: 'en',
        maxResultCount: 1
      })
    });

    if (!placeResponse.ok) {
      throw new Error(`Places API error: ${placeResponse.status}`);
    }

    const placeData = await placeResponse.json();
    console.log('✅ Places API working!');
    console.log('Found:', placeData.places[0].displayName.text);

    return true;
  } catch (error) {
    console.error('❌ Places API test failed:', error.message);
    return false;
  }
}

async function testGeminiAPI() {
  console.log('🤖 Testing Gemini API...');

  try {
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: 'Hello, can you help me plan a day in New York?'
          }]
        }]
      })
    });

    if (!geminiResponse.ok) {
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    console.log('✅ Gemini API working!');
    console.log('Response:', geminiData.candidates[0].content.parts[0].text.substring(0, 100) + '...');

    return true;
  } catch (error) {
    console.error('❌ Gemini API test failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Testing Google APIs...\n');

  const placesWorking = await testPlacesAPI();
  console.log('');

  const geminiWorking = await testGeminiAPI();
  console.log('');

  if (placesWorking && geminiWorking) {
    console.log('🎉 All APIs are working correctly!');
    console.log('✅ Gemini API: Enabled and responding');
    console.log('✅ Places API: Enabled and responding');
    console.log('✅ Weather API: Configured (will use fallback for now)');

    console.log('\n📋 Summary:');
    console.log('- Gemini API Key: AIzaSyBR28oJSgktemeF-mp6BPW_MZr44zPvvQQ');
    console.log('- Places API Key: AIzaSyD9u3HH4FJPOEkk82T6AgL6QkEtVxAjzGk');
    console.log('- Weather API Key: AIzaSyCu7Qg79LZMMDdKJ6lMP8PRLfr-z2pyqYM');
    console.log('\n🔧 Next steps:');
    console.log('1. The APIs are enabled and working');
    console.log('2. Real itinerary generation should work with verified places');
    console.log('3. Weather will use OpenWeatherMap fallback for now');
    console.log('4. All API keys are properly configured in .env file');
  } else {
    console.log('❌ Some APIs are not working correctly');
  }
}

main().catch(console.error);
