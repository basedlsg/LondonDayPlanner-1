import { searchPlace } from './lib/googlePlaces';
import { enhancedPlaceSearch } from './lib/enhancedPlaceSearch';

async function testLocationBias() {
  console.log('🧪 Testing location bias fixes for neighborhood searches...\n');

  // Test 1: Direct searchPlace with Astoria
  console.log('Test 1: searchPlace for coffee in Astoria');
  try {
    const result1 = await searchPlace('coffee shop in Astoria', {
      type: 'cafe',
      citySlug: 'nyc'
    });
    
    if (result1.primary) {
      console.log('✅ Found:', result1.primary.name);
      console.log('📍 Address:', result1.primary.formatted_address);
      console.log('📍 Location:', result1.primary.geometry.location);
      
      // Check if the result is actually in or near Astoria
      const address = result1.primary.formatted_address.toLowerCase();
      if (address.includes('astoria') || address.includes('queens')) {
        console.log('✅ Result is correctly in Astoria/Queens area');
      } else {
        console.log('⚠️  Result may not be in Astoria:', address);
      }
    }
  } catch (error) {
    console.error('❌ Test 1 failed:', error);
  }

  console.log('\n---\n');

  // Test 2: enhancedPlaceSearch with Harlem
  console.log('Test 2: enhancedPlaceSearch for restaurants in Harlem');
  try {
    const result2 = await enhancedPlaceSearch({
      query: 'restaurants in Harlem',
      location: 'Harlem',
      type: 'restaurant',
      cityContext: {
        name: 'New York City',
        slug: 'nyc',
        timezone: 'America/New_York'
      }
    });
    
    if (result2.primary) {
      console.log('✅ Found:', result2.primary.name);
      console.log('📍 Address:', result2.primary.formatted_address);
      console.log('📍 Location:', result2.primary.geometry.location);
      console.log('⭐ Rating:', result2.primary.rating);
      
      // Check if the result is actually in or near Harlem
      const address = result2.primary.formatted_address.toLowerCase();
      if (address.includes('harlem') || address.includes('manhattan')) {
        console.log('✅ Result is correctly in Harlem/Manhattan area');
      } else {
        console.log('⚠️  Result may not be in Harlem:', address);
      }
    }
  } catch (error) {
    console.error('❌ Test 2 failed:', error);
  }

  console.log('\n---\n');

  // Test 3: searchPlace with Brooklyn neighborhood
  console.log('Test 3: searchPlace for pizza in Williamsburg');
  try {
    const result3 = await searchPlace('pizza in Williamsburg', {
      type: 'restaurant',
      keywords: ['pizza'],
      citySlug: 'nyc'
    });
    
    if (result3.primary) {
      console.log('✅ Found:', result3.primary.name);
      console.log('📍 Address:', result3.primary.formatted_address);
      console.log('📍 Location:', result3.primary.geometry.location);
      
      // Check if the result is actually in or near Williamsburg
      const address = result3.primary.formatted_address.toLowerCase();
      if (address.includes('williamsburg') || address.includes('brooklyn')) {
        console.log('✅ Result is correctly in Williamsburg/Brooklyn area');
      } else {
        console.log('⚠️  Result may not be in Williamsburg:', address);
      }
    }
  } catch (error) {
    console.error('❌ Test 3 failed:', error);
  }

  console.log('\n---\n');

  // Test 4: Test with no specific neighborhood (should use city center)
  console.log('Test 4: searchPlace for museums in NYC (no specific neighborhood)');
  try {
    const result4 = await searchPlace('museums', {
      type: 'museum',
      citySlug: 'nyc'
    });
    
    if (result4.primary) {
      console.log('✅ Found:', result4.primary.name);
      console.log('📍 Address:', result4.primary.formatted_address);
      console.log('📍 Location:', result4.primary.geometry.location);
      console.log('ℹ️  Should be using NYC center coordinates for search');
    }
  } catch (error) {
    console.error('❌ Test 4 failed:', error);
  }
}

// Run the test
testLocationBias().catch(console.error);