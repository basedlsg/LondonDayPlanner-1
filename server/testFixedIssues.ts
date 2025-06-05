#!/usr/bin/env node
import { config } from 'dotenv';
import { processWithGemini } from './lib/geminiProcessor';
import { enhancedPlaceSearch } from './lib/enhancedPlaceSearch';
import { parseTimeString } from './lib/timeUtils';
import { formatInTimeZone } from 'date-fns-tz';

// Load environment variables
config();

async function testVenuePreferences() {
  console.log('\n🧪 Testing venue preference extraction and usage...\n');
  
  const testQuery = 'I want to start with coffee at a hipster cafe in Williamsburg at 10am, then lunch at an authentic Jewish deli in Lower East Side at noon';
  
  console.log('📝 Test query:', testQuery);
  
  try {
    // Test Gemini processing
    const parsed = await processWithGemini(testQuery);
    console.log('\n🤖 Gemini parsed result:');
    console.log(JSON.stringify(parsed, null, 2));
    
    if (parsed?.fixedTimeEntries) {
      console.log('\n🔍 Testing enhanced place search with preferences...\n');
      
      // Test search for first activity (hipster cafe)
      const firstEntry = parsed.fixedTimeEntries[0];
      if (firstEntry) {
        console.log('1️⃣ First activity:', firstEntry.activity);
        console.log('   Location:', firstEntry.location);
        console.log('   Venue preference:', firstEntry.venuePreference);
        console.log('   Search parameters:', firstEntry.searchParameters);
        
        const searchResult1 = await enhancedPlaceSearch({
          query: firstEntry.searchParameters?.venuePreference || firstEntry.activity || 'coffee',
          location: firstEntry.location,
          preferences: firstEntry.searchParameters,
          cityContext: {
            name: 'New York City',
            slug: 'nyc',
            timezone: 'America/New_York'
          }
        });
        
        if (searchResult1.primary) {
          console.log('   ✅ Found venue:', searchResult1.primary.name);
          console.log('   📍 Address:', searchResult1.primary.formatted_address);
        } else {
          console.log('   ❌ No venue found');
        }
      }
      
      // Test search for second activity (Jewish deli)
      const secondEntry = parsed.fixedTimeEntries[1];
      if (secondEntry) {
        console.log('\n2️⃣ Second activity:', secondEntry.activity);
        console.log('   Location:', secondEntry.location);
        console.log('   Venue preference:', secondEntry.venuePreference);
        console.log('   Search parameters:', secondEntry.searchParameters);
        
        const searchResult2 = await enhancedPlaceSearch({
          query: secondEntry.searchParameters?.venuePreference || secondEntry.activity || 'lunch',
          location: secondEntry.location,
          preferences: secondEntry.searchParameters,
          cityContext: {
            name: 'New York City',
            slug: 'nyc',
            timezone: 'America/New_York'
          }
        });
        
        if (searchResult2.primary) {
          console.log('   ✅ Found venue:', searchResult2.primary.name);
          console.log('   📍 Address:', searchResult2.primary.formatted_address);
        } else {
          console.log('   ❌ No venue found');
        }
      }
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function testTimeZones() {
  console.log('\n🧪 Testing time zone handling...\n');
  
  const testTimes = [
    { time: '10am', context: 'coffee' },
    { time: '3pm', context: 'afternoon tea' },
    { time: '6pm', context: 'dinner' },
    { time: 'at 6', context: 'steak dinner' }
  ];
  
  const baseDate = new Date('2025-01-26');
  const timezones = {
    'nyc': 'America/New_York',
    'london': 'Europe/London',
    'austin': 'America/Chicago'
  };
  
  for (const [city, timezone] of Object.entries(timezones)) {
    console.log(`\n📍 Testing ${city.toUpperCase()} (${timezone}):`);
    
    for (const test of testTimes) {
      const parsed = parseTimeString(test.time, baseDate, timezone);
      const formatted = formatInTimeZone(parsed, timezone, 'h:mm a zzz');
      console.log(`   "${test.time}" (${test.context}) → ${formatted}`);
    }
  }
}

async function testLocationBias() {
  console.log('\n🧪 Testing location bias for neighborhoods...\n');
  
  const testLocations = [
    { location: 'Williamsburg', city: 'nyc' },
    { location: 'Upper East Side', city: 'nyc' },
    { location: 'Shoreditch', city: 'london' },
    { location: 'Covent Garden', city: 'london' }
  ];
  
  for (const test of testLocations) {
    console.log(`\n📍 Testing ${test.location} in ${test.city.toUpperCase()}:`);
    
    try {
      const result = await enhancedPlaceSearch({
        query: 'coffee shop',
        location: test.location,
        cityContext: {
          name: test.city === 'nyc' ? 'New York City' : 'London',
          slug: test.city,
          timezone: test.city === 'nyc' ? 'America/New_York' : 'Europe/London'
        }
      });
      
      if (result.primary) {
        console.log('   ✅ Found:', result.primary.name);
        console.log('   📍 Address:', result.primary.formatted_address);
        if (result.primary.geometry?.location) {
          console.log(`   🎯 Coordinates: ${result.primary.geometry.location.lat}, ${result.primary.geometry.location.lng}`);
        }
      } else {
        console.log('   ❌ No results found');
      }
    } catch (error) {
      console.error('   ❌ Error:', error);
    }
  }
}

async function main() {
  console.log('🚀 Starting fixed issues test...\n');
  
  // Test 1: Venue preferences
  await testVenuePreferences();
  
  // Test 2: Time zones
  await testTimeZones();
  
  // Test 3: Location bias
  await testLocationBias();
  
  console.log('\n✅ All tests completed!');
}

// Run the tests
main().catch(console.error);