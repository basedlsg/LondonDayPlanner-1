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

interface VenueTestCase {
  query: string;
  expectedVenuePreferences: string[];
}

const venueTests: VenueTestCase[] = [
  {
    query: "Breakfast at a hipster cafe in Brooklyn at 9am",
    expectedVenuePreferences: ["hipster cafe"]
  },
  {
    query: "Lunch at an authentic Jewish deli in Upper East Side",
    expectedVenuePreferences: ["authentic Jewish deli"]
  },
  {
    query: "Drinks at a rooftop bar with a view of the skyline",
    expectedVenuePreferences: ["rooftop bar"]
  },
  {
    query: "Dinner at a michelin star restaurant, somewhere fancy",
    expectedVenuePreferences: ["michelin star restaurant"]
  },
  {
    query: "Coffee at a hole-in-the-wall spot locals love",
    expectedVenuePreferences: ["hole-in-the-wall"]
  },
  {
    query: "Family dinner at a kid-friendly Italian place with outdoor seating",
    expectedVenuePreferences: ["kid-friendly Italian", "family-friendly"]
  },
  {
    query: "Trendy brunch spot with good Instagram photo ops and bottomless mimosas",
    expectedVenuePreferences: ["trendy brunch spot"]
  },
  {
    query: "Sports bar to watch the game with good wings and beer selection",
    expectedVenuePreferences: ["sports bar"]
  },
  {
    query: "Vegan restaurant that even meat-eaters would enjoy",
    expectedVenuePreferences: ["vegan restaurant"]
  },
  {
    query: "Speakeasy-style cocktail bar with craft cocktails",
    expectedVenuePreferences: ["speakeasy-style cocktail bar"]
  }
];

async function testVenuePreferences() {
  console.log('🍽️  Testing Venue Preference Detection\n');
  console.log('=' .repeat(60));
  
  let successCount = 0;
  let totalPreferences = 0;
  let detectedPreferences = 0;
  
  for (const test of venueTests) {
    console.log(`\n📝 Query: "${test.query}"`);
    console.log(`🎯 Expected: ${test.expectedVenuePreferences.join(', ')}`);
    
    try {
      const result = await parseItineraryRequest(test.query);
      
      if (result.fixedTimes && result.fixedTimes.length > 0) {
        const foundPreferences: string[] = [];
        
        result.fixedTimes.forEach(activity => {
          if (activity.searchPreference) {
            foundPreferences.push(activity.searchPreference);
            console.log(`✅ Found: "${activity.searchPreference}"`);
          }
        });
        
        totalPreferences += test.expectedVenuePreferences.length;
        detectedPreferences += foundPreferences.length;
        
        if (foundPreferences.length > 0) {
          successCount++;
          console.log(`✓ Successfully detected ${foundPreferences.length} venue preference(s)`);
        } else {
          console.log(`❌ No venue preferences detected`);
        }
      } else {
        console.log(`❌ No activities parsed`);
      }
      
    } catch (error: any) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('📊 VENUE PREFERENCE DETECTION SUMMARY');
  console.log('=' .repeat(60));
  console.log(`Total Tests: ${venueTests.length}`);
  console.log(`Successful Detection: ${successCount}/${venueTests.length} (${Math.round(successCount/venueTests.length * 100)}%)`);
  console.log(`Preferences Detected: ${detectedPreferences}/${totalPreferences} (${Math.round(detectedPreferences/totalPreferences * 100)}%)`);
  console.log('\n💡 Next Steps:');
  console.log('- Ensure venuePreference field is properly extracted from Gemini response');
  console.log('- Map venue preferences to Google Places search parameters');
  console.log('- Use preferences to filter and rank search results');
}

// Run the test
testVenuePreferences().catch(console.error);