/**
 * Backend Stress Test Script
 * Tests the itinerary planning system with various query tiers
 * Run with: npx ts-node server/scripts/stress-test.ts
 */

import { ItineraryPlanner, getItineraryPlanner } from '../services/ItineraryPlanner.js';
import { QueryClassifier, queryClassifier } from '../services/QueryClassifier.js';
import { getCityConfig } from '../config/cities.js';
import { Itinerary } from '../types/index.js';

interface TestCase {
  query: string;
  city: string;
  expectedTier: 'simple' | 'detailed' | 'complex';
  description: string;
}

interface TestResult {
  query: string;
  city: string;
  expectedTier: string;
  actualTier: string;
  tierMatch: boolean;
  success: boolean;
  duration: number;
  placesCount: number;
  hasRequiredFields: boolean;
  model: string;
  error?: string;
}

const TEST_CASES: TestCase[] = [
  // Simple queries
  {
    query: 'Coffee in Mayfair',
    city: 'london',
    expectedTier: 'simple',
    description: 'Basic venue search',
  },
  {
    query: 'Lunch in Manhattan',
    city: 'new-york',
    expectedTier: 'simple',
    description: 'Basic venue search - NYC',
  },
  {
    query: 'Dinner in Shibuya',
    city: 'tokyo',
    expectedTier: 'simple',
    description: 'Basic venue search - Tokyo',
  },

  // Detailed queries
  {
    query: 'Quiet cafe with wifi in Shoreditch until 6PM',
    city: 'london',
    expectedTier: 'detailed',
    description: 'Preferences + time constraint',
  },
  {
    query: 'Romantic dinner in Chelsea around 8PM',
    city: 'london',
    expectedTier: 'detailed',
    description: 'Ambience + time',
  },
  {
    query: 'Upscale cocktail bar in Soho for a birthday',
    city: 'london',
    expectedTier: 'detailed',
    description: 'Quality + occasion preference',
  },

  // Complex queries
  {
    query: 'Morning coffee -- lunch Mayfair 12 -- work until 6 -- drinks Chelsea',
    city: 'london',
    expectedTier: 'complex',
    description: 'Full day itinerary with separators',
  },
  {
    query: 'Breakfast in Soho then museum then dinner in Covent Garden',
    city: 'london',
    expectedTier: 'complex',
    description: 'Multi-stop with "then"',
  },
  {
    query: 'Coffee for calls in the morning, lunch meeting at 1pm in Mayfair, after that work somewhere quiet, finally drinks at a hidden bar',
    city: 'london',
    expectedTier: 'complex',
    description: 'Complex multi-activity day',
  },
];

/**
 * Validate that an itinerary has all required fields for iOS decoding
 */
function validateItinerary(itinerary: Itinerary): boolean {
  const requiredFields = ['id', 'title', 'query', 'venues', 'created', 'city', 'planDate'];

  for (const field of requiredFields) {
    if (!(field in itinerary) || itinerary[field as keyof Itinerary] === undefined) {
      console.log(`  Missing required field: ${field}`);
      return false;
    }
  }

  // Validate venues array (iOS expects 'venues' key in JSON)
  if (!Array.isArray(itinerary.venues) || itinerary.venues.length === 0) {
    console.log('  Invalid or empty venues array');
    return false;
  }

  // Validate each venue has required fields matching iOS ScheduledPlace
  for (const venue of itinerary.venues) {
    if (!venue.name || !venue.time || !venue.location) {
      console.log('  Venue missing name, time, or location');
      return false;
    }
  }

  return true;
}

async function runTest(testCase: TestCase): Promise<TestResult> {
  const start = Date.now();

  // Test classification first
  const classification = queryClassifier.classify(testCase.query);

  const result: TestResult = {
    query: testCase.query,
    city: testCase.city,
    expectedTier: testCase.expectedTier,
    actualTier: classification.tier,
    tierMatch: classification.tier === testCase.expectedTier,
    success: false,
    duration: 0,
    placesCount: 0,
    hasRequiredFields: false,
    model: classification.model,
  };

  try {
    const cityConfig = getCityConfig(testCase.city);
    const planner = getItineraryPlanner();

    const itinerary = await planner.createPlan(
      {
        query: testCase.query,
        date: new Date().toISOString().split('T')[0],
        startTime: '09:00',
      },
      cityConfig
    );

    result.duration = Date.now() - start;
    result.placesCount = itinerary.venues?.length || 0;
    result.hasRequiredFields = validateItinerary(itinerary);
    result.success = result.hasRequiredFields && result.placesCount > 0;
  } catch (error) {
    result.duration = Date.now() - start;
    result.error = error instanceof Error ? error.message : 'Unknown error';
    result.success = false;
  }

  return result;
}

async function runStressTest() {
  console.log('='.repeat(70));
  console.log('LONDON DAY PLANNER - BACKEND STRESS TEST');
  console.log('='.repeat(70));
  console.log(`Running ${TEST_CASES.length} test cases...\n`);

  const results: TestResult[] = [];

  for (let i = 0; i < TEST_CASES.length; i++) {
    const testCase = TEST_CASES[i];
    console.log(`[${i + 1}/${TEST_CASES.length}] Testing: "${testCase.query.slice(0, 50)}..."`);
    console.log(`         City: ${testCase.city} | Expected: ${testCase.expectedTier}`);

    const result = await runTest(testCase);
    results.push(result);

    if (result.success) {
      console.log(`         ✓ SUCCESS in ${result.duration}ms`);
      console.log(`           Tier: ${result.actualTier} (${result.tierMatch ? 'MATCH' : 'MISMATCH'})`);
      console.log(`           Model: ${result.model}`);
      console.log(`           Places: ${result.placesCount}`);
    } else {
      console.log(`         ✗ FAILED in ${result.duration}ms`);
      if (result.error) {
        console.log(`           Error: ${result.error}`);
      }
      if (!result.hasRequiredFields) {
        console.log(`           Missing required fields for iOS decoding`);
      }
    }
    console.log();
  }

  // Summary
  console.log('='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);
  const tierMatches = results.filter((r) => r.tierMatch);
  const validStructure = results.filter((r) => r.hasRequiredFields);
  const avgDuration =
    successful.length > 0
      ? successful.reduce((a, r) => a + r.duration, 0) / successful.length
      : 0;

  console.log(`Total tests:        ${results.length}`);
  console.log(`Successful:         ${successful.length} (${((successful.length / results.length) * 100).toFixed(1)}%)`);
  console.log(`Failed:             ${failed.length}`);
  console.log(`Tier matches:       ${tierMatches.length}/${results.length}`);
  console.log(`Valid structure:    ${validStructure.length}/${results.length}`);
  console.log(`Avg response time:  ${avgDuration.toFixed(0)}ms`);

  // Model usage breakdown
  const modelUsage = results.reduce((acc, r) => {
    acc[r.model] = (acc[r.model] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('\nModel Usage:');
  for (const [model, count] of Object.entries(modelUsage)) {
    console.log(`  ${model}: ${count} queries`);
  }

  // Failed tests details
  if (failed.length > 0) {
    console.log('\nFailed Tests:');
    for (const result of failed) {
      console.log(`  - "${result.query.slice(0, 40)}..."`);
      console.log(`    Error: ${result.error || 'Invalid structure'}`);
    }
  }

  console.log('\n' + '='.repeat(70));

  // Exit with appropriate code
  process.exit(failed.length > 0 ? 1 : 0);
}

// Run the test
runStressTest().catch((error) => {
  console.error('Stress test failed:', error);
  process.exit(1);
});
