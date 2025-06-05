/**
 * Simplified Test: Verify Gemini 3-Venue Parsing
 * 
 * This test bypasses the complex processing chain and directly tests
 * the Gemini processor to verify it correctly identifies 3 venues.
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables first
const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

import { processWithGemini } from './server/lib/geminiProcessor';
import { config } from './server/config';

async function testGeminiParsing() {
  console.log('🧪 Testing Gemini 3-Venue Parsing');
  console.log('=====================================');
  
  // Force config to reload environment variables
  console.log('🔧 Forcing config environment recheck...');
  config.recheckEnvironment();
  console.log('');

  const testQuery = "I have a lunch in Mayfair 12 -- would like a place with nice fish. Afterwards I would like to work at a nearby coffee shop. Before going to Chelsea at 7PM to meet some friends for drinks at a cocktail bar -- could you help me choose one?";
  
  const cityContext = {
    name: 'London',
    slug: 'london',
    timezone: 'Europe/London'
  };

  console.log('🔍 Query:', testQuery);
  console.log('🏙️ City:', cityContext.name);
  console.log('');

  try {
    console.log('🚀 Calling processWithGemini directly...');
    const result = await processWithGemini(
      testQuery,
      '2025-06-02',
      '12:00',
      cityContext
    );

    console.log('✅ Gemini processing completed!');
    console.log('');

    if (!result) {
      console.log('❌ Result is null - Gemini processing failed');
      return;
    }

    console.log('📋 Parsed Activities:');
    console.log('===================');

    // Count all activities
    let activityCount = 0;
    let activities: any[] = [];

    if (result.fixedTimeEntries && result.fixedTimeEntries.length > 0) {
      console.log(`📌 Fixed Time Entries (${result.fixedTimeEntries.length}):`);
      result.fixedTimeEntries.forEach((entry, i) => {
        console.log(`  ${i + 1}. ${entry.time} - ${entry.activity} at ${entry.location}`);
        if (entry.venuePreference) {
          console.log(`     🎯 Preference: ${entry.venuePreference}`);
        }
        activities.push(entry);
        activityCount++;
      });
      console.log('');
    }

    if (result.timeBlocks && result.timeBlocks.length > 0) {
      console.log(`⏰ Time Blocks (${result.timeBlocks.length}):`);
      result.timeBlocks.forEach((block, i) => {
        console.log(`  ${i + 1}. ${block.startTime}-${block.endTime} - ${block.activity} at ${block.location}`);
        activities.push(block);
        activityCount++;
      });
      console.log('');
    }

    if (result.fixedAppointments && result.fixedAppointments.length > 0) {
      console.log(`📅 Fixed Appointments (${result.fixedAppointments.length}):`);
      result.fixedAppointments.forEach((appt, i) => {
        console.log(`  ${i + 1}. ${appt.time} - ${appt.activity} at ${appt.location}`);
        activities.push(appt);
        activityCount++;
      });
      console.log('');
    }

    if (result.flexibleTimeEntries && result.flexibleTimeEntries.length > 0) {
      console.log(`🔄 Flexible Time Entries (${result.flexibleTimeEntries.length}):`);
      result.flexibleTimeEntries.forEach((entry, i) => {
        console.log(`  ${i + 1}. ${entry.activity} at ${entry.location}`);
        activities.push(entry);
        activityCount++;
      });
      console.log('');
    }

    // Summary
    console.log('📊 SUMMARY:');
    console.log(`Total activities parsed: ${activityCount}`);
    
    if (activityCount === 3) {
      console.log('✅ SUCCESS: Gemini correctly identified 3 activities!');
      console.log('   🐟 1. Lunch (fish restaurant in Mayfair)');
      console.log('   ☕ 2. Work (coffee shop)');
      console.log('   🍸 3. Drinks (cocktail bar in Chelsea)');
    } else {
      console.log(`❌ ISSUE: Expected 3 activities, got ${activityCount}`);
    }

    console.log('');
    console.log('🔍 Raw Gemini Result:');
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('❌ Error testing Gemini parsing:', error);
  }
}

// Run the test
testGeminiParsing().then(() => {
  console.log('🏁 Test completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});