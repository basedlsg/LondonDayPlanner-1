import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { parseItineraryRequest } from './lib/nlp-fixed';
import { config } from './config';

// Initialize config after loading env vars
config.initialize();

async function testMultiStepQuery() {
  const queries = [
    "I want breakfast at a hipster cafe in Brooklyn at 9am, then visit the Met museum around 11, grab lunch at an authentic Jewish deli in the Upper East Side, and end with drinks at a rooftop bar in Midtown around 6pm",
    "Start my day with coffee in SoHo, then shopping in Greenwich Village, lunch somewhere trendy, afternoon at Central Park, and dinner at an Italian place in Little Italy",
    "Morning yoga in Chelsea, brunch at a vegan place, afternoon gallery hopping in Chelsea, then cocktails and dinner in the East Village"
  ];

  console.log('🧪 Testing Multi-Step Query Processing\n');

  for (const query of queries) {
    console.log(`\n📝 Query: "${query}"\n`);
    
    try {
      const result = await parseItineraryRequest(query);
      
      console.log('✅ Parsed Result:');
      console.log('Start Location:', result.startLocation);
      console.log('Destinations:', result.destinations);
      console.log('\n📍 Activities:');
      
      if (result.fixedTimes && result.fixedTimes.length > 0) {
        result.fixedTimes.forEach((activity, index) => {
          console.log(`\n${index + 1}. ${activity.searchTerm || 'Activity'}`);
          console.log(`   Time: ${activity.displayTime || activity.time}`);
          console.log(`   Location: ${activity.location}`);
          console.log(`   Type: ${activity.type}`);
          if (activity.searchPreference) {
            console.log(`   Venue Preference: ${activity.searchPreference}`);
          }
          if (activity.keywords) {
            console.log(`   Keywords: ${activity.keywords}`);
          }
        });
      }
      
      console.log('\n-----------------------------------');
    } catch (error: any) {
      console.error('❌ Error processing query:', error.message);
    }
  }
}

// Run the test
testMultiStepQuery().catch(console.error);