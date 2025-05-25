// server/test-google-direct.ts

import dotenv from 'dotenv';
import path from 'path';
import fetch from 'node-fetch'; // Assuming node-fetch is available or use built-in fetch in Node 18+

async function testGooglePlacesAPI() {
  console.log('🧪 Testing Google Places API directly...');

  // Load environment variables explicitly for this script
  const envPath = path.resolve(process.cwd(), '.env');
  const dotenvResult = dotenv.config({ path: envPath });

  if (dotenvResult.error) {
    console.error('❌ Error loading .env file for test script:', dotenvResult.error);
    return;
  }
  if (!dotenvResult.parsed || !dotenvResult.parsed.GOOGLE_PLACES_API_KEY) {
    console.error('❌ GOOGLE_PLACES_API_KEY not found in .env file or dotenv parsing failed.');
    return;
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error('❌ GOOGLE_PLACES_API_KEY is not set in process.env after dotenv.config()');
    return;
  }

  console.log(`🔑 Using API Key (first 5 chars): ${apiKey.substring(0, 5)}...`);

  const query = 'restaurants in SoHo New York';
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;

  console.log(`🚀 Sending request to Google Places API: ${url.replace(apiKey, 'YOUR_API_KEY')}`);

  try {
    const response = await fetch(url);
    const data: any = await response.json();

    console.log(`🔍 Google Places API Response Status: ${response.status}`);
    // console.log('🔍 Google Places API Response Data:', JSON.stringify(data, null, 2));

    if (data.results && data.results.length > 0) {
      console.log(`✅ SUCCESS! Found ${data.results.length} places.`);
      data.results.slice(0, 2).forEach((place: any) => {
        console.log(`   - ${place.name} (${place.formatted_address})`);
      });
    } else if (data.status) {
      console.error(`❌ Google Places API returned status: ${data.status}`);
      if (data.error_message) {
        console.error(`   Error Message: ${data.error_message}`);
      }
    } else {
      console.warn('⚠️ No results found, and no specific error status from Google.');
      console.log('Raw data: ', data);
    }
  } catch (error: any) {
    console.error('❌ Exception during Google Places API call:', error.message);
    if (error.cause) console.error('   Cause:', error.cause);
  }
}

testGooglePlacesAPI(); 