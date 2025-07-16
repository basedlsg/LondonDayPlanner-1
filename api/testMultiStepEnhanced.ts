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

interface TestCase {
  name: string;
  query: string;
  expectedActivities: number;
  expectedFeatures: string[];
}

const testCases: TestCase[] = [
  // Basic multi-step queries
  {
    name: "Simple sequential activities",
    query: "Coffee in SoHo at 9am, shopping in Greenwich Village, lunch at noon, then Central Park",
    expectedActivities: 4,
    expectedFeatures: ["specific times", "multiple locations", "sequential flow"]
  },
  
  // Complex venue preferences
  {
    name: "Detailed venue preferences",
    query: "Start with breakfast at a trendy brunch spot with outdoor seating in Williamsburg around 10am, then vintage shopping in Brooklyn, grab coffee at a hipster cafe with good wifi, and dinner at an upscale Italian place with a view",
    expectedActivities: 4,
    expectedFeatures: ["venue preferences", "ambiance requirements", "specific amenities"]
  },
  
  // Time-based queries
  {
    name: "Mixed time formats",
    query: "Morning yoga at 7, breakfast after that, meetings until 2pm, late lunch at a sushi place, evening walk in High Line at sunset, dinner at 8:30",
    expectedActivities: 6,
    expectedFeatures: ["relative times", "absolute times", "time ranges"]
  },
  
  // Ambiguous locations
  {
    name: "Vague location handling",
    query: "Start somewhere nice for coffee, then go to that famous museum everyone talks about, lunch wherever is good nearby, and end up at a rooftop bar with a view",
    expectedActivities: 4,
    expectedFeatures: ["vague locations", "relative positioning", "landmark references"]
  },
  
  // Group activities
  {
    name: "Group planning",
    query: "Taking my family (2 adults, 2 kids) for breakfast at a family-friendly place at 9, then to the Children's Museum, lunch at a place with kids menu, afternoon at Central Park playground, early dinner at 5:30",
    expectedActivities: 5,
    expectedFeatures: ["group size", "family-friendly", "kid-specific venues"]
  },
  
  // Budget considerations
  {
    name: "Budget-aware planning",
    query: "Looking for a budget-friendly day: cheap breakfast spot, free museum or gallery, affordable lunch under $15, walk in a park, happy hour drinks somewhere with deals",
    expectedActivities: 5,
    expectedFeatures: ["budget constraints", "price preferences", "free activities"]
  },
  
  // Weather-dependent
  {
    name: "Weather considerations",
    query: "If it's nice, picnic in Central Park at noon, otherwise lunch at a cozy indoor spot. Then either walk the High Line or visit MoMA depending on weather",
    expectedActivities: 2,
    expectedFeatures: ["weather conditions", "alternative options", "indoor/outdoor choices"]
  },
  
  // Cultural preferences
  {
    name: "Cultural and dietary needs",
    query: "Kosher breakfast in Upper West Side at 9, visit Jewish Museum, kosher lunch, afternoon at Met, early Shabbat dinner before sunset",
    expectedActivities: 5,
    expectedFeatures: ["dietary restrictions", "cultural considerations", "religious timing"]
  },
  
  // Transportation mentions
  {
    name: "Transport-aware planning",
    query: "Start in Brooklyn for brunch, take the subway to Manhattan for shopping in SoHo, walk to Little Italy for coffee, uber to Upper East Side for dinner",
    expectedActivities: 4,
    expectedFeatures: ["transport modes", "distance awareness", "route planning"]
  },
  
  // Special occasions
  {
    name: "Special occasion planning",
    query: "Planning a birthday: champagne brunch at 11, spa treatment at 2pm, shopping for a dress, cocktails at a fancy bar at 6, surprise dinner at a Michelin star restaurant at 8",
    expectedActivities: 5,
    expectedFeatures: ["special occasion", "luxury preferences", "timed coordination"]
  },
  
  // Edge cases
  {
    name: "Extremely vague query",
    query: "Just want to have a nice day in the city, you know, see some stuff and eat good food",
    expectedActivities: 2,
    expectedFeatures: ["extreme vagueness", "general preferences", "flexible timing"]
  },
  
  {
    name: "Over-specific query",
    query: "At exactly 9:17am I need coffee from a third-wave coffee shop that roasts their own beans, serves oat milk, has wifi speed over 50mbps, and plays jazz music, located within 5 minutes walk from Union Square subway",
    expectedActivities: 1,
    expectedFeatures: ["hyper-specific requirements", "technical requirements", "precise timing"]
  },
  
  {
    name: "Conflicting requirements",
    query: "Want a quiet place for breakfast but also live music, somewhere cheap but also Michelin rated, in Times Square but away from tourists",
    expectedActivities: 1,
    expectedFeatures: ["conflicting requirements", "impossible constraints", "resolution needed"]
  },
  
  // Multi-day planning
  {
    name: "Multi-day itinerary",
    query: "Friday: arrival and dinner in Midtown. Saturday: breakfast at 9, MoMA, lunch in Central Park, Broadway show at 8pm. Sunday: brunch in Brooklyn and departure",
    expectedActivities: 6,
    expectedFeatures: ["multi-day", "day-specific planning", "varied activities"]
  },
  
  // Rush hour awareness
  {
    name: "Time-sensitive routing",
    query: "Meeting in Financial District at 9am, need breakfast before that nearby, then Midtown for lunch meeting at noon, avoid rush hour travel",
    expectedActivities: 3,
    expectedFeatures: ["rush hour awareness", "business context", "efficient routing"]
  }
];

async function runComprehensiveTests() {
  console.log('🚀 Running Comprehensive Multi-Step Query Tests\n');
  console.log('=' .repeat(80));
  
  const results = {
    total: testCases.length,
    successful: 0,
    failed: 0,
    details: [] as any[]
  };
  
  for (const testCase of testCases) {
    console.log(`\n📋 Test: ${testCase.name}`);
    console.log(`📝 Query: "${testCase.query}"`);
    console.log(`🎯 Expected: ${testCase.expectedActivities} activities with ${testCase.expectedFeatures.join(', ')}`);
    
    try {
      const startTime = Date.now();
      const result = await parseItineraryRequest(testCase.query);
      const processingTime = Date.now() - startTime;
      
      const activities = result.fixedTimes || [];
      const success = activities.length > 0;
      
      if (success) {
        results.successful++;
        console.log(`✅ Success! Parsed ${activities.length} activities in ${processingTime}ms`);
        
        // Display parsed activities
        activities.forEach((activity, index) => {
          console.log(`\n  ${index + 1}. ${activity.searchTerm || 'Activity'}`);
          console.log(`     📍 Location: ${activity.location}`);
          console.log(`     🕐 Time: ${activity.displayTime || activity.time}`);
          console.log(`     🏷️  Type: ${activity.type}`);
          
          if (activity.searchPreference) {
            console.log(`     🎯 Venue Preference: ${activity.searchPreference}`);
          }
          
          if (activity.keywords && activity.keywords.length > 0) {
            console.log(`     🔍 Keywords: ${activity.keywords.join(', ')}`);
          }
          
          if (activity.minRating) {
            console.log(`     ⭐ Min Rating: ${activity.minRating}`);
          }
        });
        
        // Check for advanced features
        const detectedFeatures = analyzeFeatures(result, activities);
        console.log(`\n  🔍 Detected Features: ${detectedFeatures.join(', ')}`);
        
        results.details.push({
          testCase: testCase.name,
          success: true,
          activitiesFound: activities.length,
          processingTime,
          detectedFeatures
        });
        
      } else {
        results.failed++;
        console.log(`❌ Failed: No activities parsed`);
        results.details.push({
          testCase: testCase.name,
          success: false,
          error: 'No activities parsed'
        });
      }
      
    } catch (error: any) {
      results.failed++;
      console.log(`❌ Error: ${error.message}`);
      results.details.push({
        testCase: testCase.name,
        success: false,
        error: error.message
      });
    }
    
    console.log('\n' + '-'.repeat(80));
  }
  
  // Summary Report
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY REPORT');
  console.log('='.repeat(80));
  console.log(`Total Tests: ${results.total}`);
  console.log(`✅ Successful: ${results.successful} (${((results.successful/results.total)*100).toFixed(1)}%)`);
  console.log(`❌ Failed: ${results.failed} (${((results.failed/results.total)*100).toFixed(1)}%)`);
  console.log('\nProcessing Time Analysis:');
  
  const successfulTests = results.details.filter(d => d.success);
  if (successfulTests.length > 0) {
    const times = successfulTests.map(d => d.processingTime);
    console.log(`  Average: ${(times.reduce((a,b) => a+b, 0) / times.length).toFixed(0)}ms`);
    console.log(`  Min: ${Math.min(...times)}ms`);
    console.log(`  Max: ${Math.max(...times)}ms`);
  }
  
  // Feature Detection Summary
  console.log('\n🎯 Feature Detection Summary:');
  const allFeatures = new Set<string>();
  successfulTests.forEach(test => {
    test.detectedFeatures?.forEach((f: string) => allFeatures.add(f));
  });
  console.log(`Unique features detected: ${Array.from(allFeatures).join(', ')}`);
  
  // Recommendations
  console.log('\n💡 Recommendations for Enhancement:');
  if (results.failed > 0) {
    console.log('- Improve handling of edge cases and vague queries');
    console.log('- Add fallback mechanisms for failed parsing');
    console.log('- Enhance venue preference extraction');
  }
  
  console.log('\n' + '='.repeat(80));
}

function analyzeFeatures(result: any, activities: any[]): string[] {
  const features: string[] = [];
  
  // Check for specific times vs flexible times
  const hasSpecificTimes = activities.some(a => a.time && /^\d{2}:\d{2}/.test(a.time));
  const hasFlexibleTimes = activities.some(a => a.displayTime && /morning|afternoon|evening/i.test(a.displayTime));
  
  if (hasSpecificTimes) features.push('specific-times');
  if (hasFlexibleTimes) features.push('flexible-times');
  
  // Check for venue preferences
  const hasVenuePreferences = activities.some(a => a.searchPreference);
  if (hasVenuePreferences) features.push('venue-preferences');
  
  // Check for multiple locations
  const uniqueLocations = new Set(activities.map(a => a.location));
  if (uniqueLocations.size > 1) features.push('multi-location');
  
  // Check for sequential planning
  if (activities.length > 2) features.push('sequential-planning');
  
  // Check for dietary/special requirements
  const hasSpecialRequirements = activities.some(a => 
    a.keywords?.some((k: string) => /kosher|vegan|vegetarian|gluten-free|halal/i.test(k))
  );
  if (hasSpecialRequirements) features.push('dietary-requirements');
  
  // Check for budget awareness
  const hasBudgetConsiderations = activities.some(a => 
    a.keywords?.some((k: string) => /budget|cheap|affordable|free|happy hour/i.test(k))
  );
  if (hasBudgetConsiderations) features.push('budget-aware');
  
  // Check for group planning
  if (result.preferences?.group || activities.some(a => a.keywords?.some((k: string) => /family|kids|group/i.test(k)))) {
    features.push('group-planning');
  }
  
  return features;
}

// Run the comprehensive tests
runComprehensiveTests().catch(console.error);