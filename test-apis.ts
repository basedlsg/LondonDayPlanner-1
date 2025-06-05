import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

// Test Google Places API
async function testGooglePlacesAPI() {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  console.log('\n🔍 Testing Google Places API...');
  console.log(`API Key present: ${!!apiKey} (length: ${apiKey?.length || 0})`);
  
  if (!apiKey) {
    console.error('❌ GOOGLE_PLACES_API_KEY not found in environment');
    return false;
  }

  try {
    const searchQuery = 'restaurant';
    const location = '40.7128,-74.0060'; // NYC coordinates
    const radius = 1000;
    
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location}&radius=${radius}&type=${searchQuery}&key=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK') {
      console.log(`✅ Google Places API working! Found ${data.results.length} places`);
      console.log(`First result: ${data.results[0]?.name || 'No results'}`);
      return true;
    } else {
      console.error(`❌ Google Places API error: ${data.status}`);
      console.error(`Error message: ${data.error_message || 'No error message'}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Google Places API request failed:', error);
    return false;
  }
}

// Test Gemini API
async function testGeminiAPI() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('\n🤖 Testing Gemini API...');
  console.log(`API Key present: ${!!apiKey} (length: ${apiKey?.length || 0})`);
  
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found in environment');
    return false;
  }

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    
    const result = await model.generateContent('Say "API test successful" if you can read this.');
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Gemini API working!');
    console.log(`Response: ${text.substring(0, 100)}...`);
    return true;
  } catch (error: any) {
    console.error('❌ Gemini API error:', error.message || error);
    return false;
  }
}

// Test server configuration
async function testServerConfig() {
  console.log('\n⚙️  Testing Server Configuration...');
  
  try {
    // Import and test the config module
    const { config, isFeatureEnabled } = await import('./server/config.js');
    
    // Force environment reload
    config.recheckEnvironment();
    
    console.log('\n📋 Feature Flags Status:');
    console.log(`- AI_PROCESSING: ${isFeatureEnabled('AI_PROCESSING')}`);
    console.log(`- USE_GEMINI: ${isFeatureEnabled('USE_GEMINI')}`);
    console.log(`- PLACES_API: ${isFeatureEnabled('PLACES_API')}`);
    
    console.log('\n🔑 API Keys Status:');
    console.log(`- GOOGLE_PLACES_API_KEY: ${config.validateApiKey('GOOGLE_PLACES_API_KEY') ? '✅ Valid' : '❌ Invalid'}`);
    console.log(`- GEMINI_API_KEY: ${config.validateApiKey('GEMINI_API_KEY') ? '✅ Valid' : '❌ Invalid'}`);
    
    const redactedConfig = config.getRedactedConfig();
    console.log('\n📊 Full Configuration:', JSON.stringify(redactedConfig, null, 2));
  } catch (error) {
    console.error('❌ Failed to test server config:', error);
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting API Tests...');
  console.log('Environment:', process.env.NODE_ENV || 'development');
  
  const placesOk = await testGooglePlacesAPI();
  const geminiOk = await testGeminiAPI();
  await testServerConfig();
  
  console.log('\n📊 Summary:');
  console.log(`- Google Places API: ${placesOk ? '✅ Working' : '❌ Failed'}`);
  console.log(`- Gemini API: ${geminiOk ? '✅ Working' : '❌ Failed'}`);
  
  if (!placesOk || !geminiOk) {
    console.log('\n⚠️  Some APIs are not working. Please check:');
    console.log('1. API keys are correct in .env file');
    console.log('2. APIs are enabled in Google Cloud Console');
    console.log('3. Billing is set up for your Google Cloud project');
  }
}

runTests().catch(console.error);