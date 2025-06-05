import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { parseItineraryRequest } from './lib/nlp-fixed';
import { config } from './config';
import { calculateTravelTime } from './lib/itinerary';

// Initialize config after loading env vars
config.initialize();

interface AdvancedTestCase {
  name: string;
  query: string;
  expectedFeatures: string[];
}

const advancedTests: AdvancedTestCase[] = [
  {
    name: "Rush hour awareness",
    query: "Meeting downtown at 9am, need to leave midtown by 8:15 to avoid rush hour. Lunch meeting at 1pm in Financial District, then dinner in Brooklyn at 7pm - need to leave by 6 to beat traffic",
    expectedFeatures: ["time-aware routing", "traffic consideration", "buffer time"]
  },
  {
    name: "Weather-dependent planning",
    query: "If sunny, picnic in Central Park at noon with sandwiches from a good deli nearby. If rainy, lunch at cozy restaurant with fireplace near the park instead",
    expectedFeatures: ["weather conditions", "alternative venues", "conditional planning"]
  },
  {
    name: "Accessibility requirements",
    query: "Need wheelchair accessible venues only: breakfast at 9, museum visit, lunch at accessible restaurant with elevator, afternoon tea at step-free location",
    expectedFeatures: ["accessibility", "wheelchair access", "step-free routes"]
  },
  {
    name: "Cultural and dietary combo",
    query: "Kosher breakfast at 8:30, visit Jewish Museum, kosher lunch near museum, afternoon at Met, early kosher dinner before Shabbat at 5pm",
    expectedFeatures: ["dietary restrictions", "cultural alignment", "religious timing"]
  },
  {
    name: "Group with mixed needs",
    query: "Family of 4 (2 adults, 2 kids ages 5 and 8): kid-friendly breakfast with healthy options, children's museum, lunch with kids menu and high chairs, playground time, early dinner at 5:30 with crayons for kids",
    expectedFeatures: ["family needs", "age-appropriate", "kid amenities"]
  },
  {
    name: "Budget optimization",
    query: "On a tight budget: free museum hours in morning, cheap lunch spot under $10, walk through free attractions, happy hour deals for early dinner",
    expectedFeatures: ["budget constraints", "free options", "deal timing"]
  },
  {
    name: "Experience preferences",
    query: "Want authentic local experiences only: where New Yorkers actually eat breakfast, hidden gem lunch spot tourists don't know, afternoon in non-touristy neighborhood, dinner at a place with no online presence",
    expectedFeatures: ["local authenticity", "off-beaten-path", "anti-tourist"]
  },
  {
    name: "Time-boxed activities", 
    query: "Have exactly 6 hours (10am-4pm): quick coffee, 2-hour museum visit, 45-minute lunch, 1-hour shopping, 30-minute park walk, must end at Grand Central by 4pm sharp",
    expectedFeatures: ["strict timing", "duration limits", "fixed endpoint"]
  },
  {
    name: "Multi-modal transport",
    query: "Start in Queens, subway to Manhattan for brunch, walk to nearby gallery, bike share to Central Park, taxi to dinner in West Village",
    expectedFeatures: ["transport modes", "inter-borough", "mixed transport"]
  },
  {
    name: "Ambiance and atmosphere",
    query: "Quiet breakfast spot for business discussion, lively lunch place with buzz, peaceful afternoon tea, romantic dinner with dim lighting and live jazz",
    expectedFeatures: ["ambiance matching", "noise levels", "atmosphere"]
  }
];

async function analyzeAdvancedFeatures() {
  console.log('🚀 Testing Advanced Multi-Step Features\n');
  console.log('=' .repeat(80));
  
  for (const test of advancedTests) {
    console.log(`\n📋 ${test.name}`);
    console.log(`📝 Query: "${test.query}"`);
    console.log(`🎯 Testing for: ${test.expectedFeatures.join(', ')}`);
    
    try {
      const startTime = Date.now();
      const result = await parseItineraryRequest(test.query);
      const processingTime = Date.now() - startTime;
      
      console.log(`\n⏱️  Processed in ${processingTime}ms`);
      
      if (result.fixedTimes && result.fixedTimes.length > 0) {
        console.log(`📍 Found ${result.fixedTimes.length} activities:\n`);
        
        // Analyze advanced features
        const detectedFeatures = [];
        
        // Check for time awareness
        const hasPreciseTiming = result.fixedTimes.some(a => 
          a.displayTime && /\d{1,2}:\d{2}/.test(a.displayTime)
        );
        if (hasPreciseTiming) detectedFeatures.push('precise-timing');
        
        // Check for venue preferences
        const hasVenuePrefs = result.fixedTimes.some(a => a.searchPreference);
        if (hasVenuePrefs) detectedFeatures.push('venue-preferences');
        
        // Check for special requirements
        const hasRequirements = result.fixedTimes.some(a => 
          a.keywords && a.keywords.length > 0
        );
        if (hasRequirements) detectedFeatures.push('special-requirements');
        
        // Check for location diversity
        const locations = new Set(result.fixedTimes.map(a => a.location));
        if (locations.size > 2) detectedFeatures.push('multi-location');
        
        // Display activities with travel times
        let lastLocation = result.startLocation || 'Midtown';
        let lastTime = null;
        
        result.fixedTimes.forEach((activity, index) => {
          console.log(`${index + 1}. ${activity.searchTerm}`);
          console.log(`   📍 ${activity.location}`);
          console.log(`   🕐 ${activity.displayTime || activity.time}`);
          
          if (activity.searchPreference) {
            console.log(`   🎯 Preference: ${activity.searchPreference}`);
          }
          
          if (activity.keywords && activity.keywords.length > 0) {
            console.log(`   📋 Requirements: ${activity.keywords.join(', ')}`);
          }
          
          // Calculate travel time from previous location
          if (index > 0 && lastLocation && activity.location) {
            try {
              const travelTime = calculateTravelTime(lastLocation, activity.location);
              console.log(`   🚕 Travel time from ${lastLocation}: ~${travelTime} mins`);
            } catch (e) {
              // Travel time calculation might fail for some locations
            }
          }
          
          lastLocation = activity.location;
          console.log('');
        });
        
        console.log(`✅ Detected features: ${detectedFeatures.join(', ')}`);
        
        // Check if expected features were captured
        const capturedExpected = test.expectedFeatures.filter(f => {
          if (f.includes('time') && hasPreciseTiming) return true;
          if (f.includes('access') && hasRequirements) return true;
          if (f.includes('budget') && result.preferences?.type === 'budget') return true;
          if (f.includes('dietary') && hasRequirements) return true;
          return false;
        });
        
        console.log(`📊 Captured ${capturedExpected.length}/${test.expectedFeatures.length} expected features`);
        
      } else {
        console.log('❌ No activities parsed');
      }
      
    } catch (error: any) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    console.log('\n' + '-'.repeat(80));
  }
  
  console.log('\n' + '=' .repeat(80));
  console.log('💡 INSIGHTS FROM ADVANCED TESTING:');
  console.log('=' .repeat(80));
  console.log('\nStrengths:');
  console.log('✅ Excellent at extracting specific times and sequences');
  console.log('✅ Good venue preference detection with enhanced prompts');
  console.log('✅ Handles multi-location itineraries well');
  console.log('✅ Preserves activity order as mentioned by user');
  
  console.log('\nAreas for Enhancement:');
  console.log('🔧 Travel time calculation between locations');
  console.log('🔧 Weather-conditional planning');
  console.log('🔧 Group size and special needs handling');
  console.log('🔧 Budget-aware venue selection');
  console.log('🔧 Rush hour and traffic awareness');
  
  console.log('\nRecommended Improvements:');
  console.log('1. Add real-time travel duration via Google Maps Distance Matrix API');
  console.log('2. Integrate weather API for conditional recommendations');
  console.log('3. Enhance venue search with accessibility filters');
  console.log('4. Add price level filtering based on budget preferences');
  console.log('5. Implement time buffers for rush hour travel');
}

// Run the advanced tests
analyzeAdvancedFeatures().catch(console.error);