// Simple script to test the frontend API and log responses
async function testFrontendAPI() {
  try {
    console.log('Testing frontend API with multiple venues...');
    
    // Make a test request with a more complex query to get multiple venues
    const response = await fetch('http://localhost:5001/api/london/plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'coffee in Mayfair at noon then shopping and dinner',
        date: '2025-06-03',
        startTime: '12:00'
      })
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    // Check the venue structure specifically
    console.log('\n=== VENUE ANALYSIS ===');
    console.log('Venues array:', data.venues);
    if (data.venues && Array.isArray(data.venues)) {
      console.log('Number of venues:', data.venues.length);
      data.venues.forEach((venue, index) => {
        console.log(`\nVenue ${index + 1}:`);
        console.log('  Name:', venue.name);
        console.log('  Time:', venue.time);
        console.log('  Address:', venue.address);
        console.log('  Categories:', venue.categories);
        console.log('  Rating:', venue.rating);
        
        // Check for undefined properties that might cause rendering issues
        console.log('  Undefined properties check:');
        Object.keys(venue).forEach(key => {
          if (venue[key] === undefined) {
            console.log(`    - ${key}: undefined`);
          }
        });
      });
    }
    
    // Check travel info
    console.log('\n=== TRAVEL INFO ANALYSIS ===');
    console.log('Travel info array:', data.travelInfo);
    if (data.travelInfo && Array.isArray(data.travelInfo)) {
      console.log('Number of travel segments:', data.travelInfo.length);
      data.travelInfo.forEach((travel, index) => {
        console.log(`Travel ${index + 1}:`, travel);
      });
    }
    
    // Check for potential rendering issues
    console.log('\n=== POTENTIAL RENDERING ISSUES ===');
    if (data.venues) {
      data.venues.forEach((venue, index) => {
        if (!venue.name) console.log(`❌ Venue ${index + 1} missing name`);
        if (!venue.time) console.log(`❌ Venue ${index + 1} missing time`);
        if (!venue.address) console.log(`❌ Venue ${index + 1} missing address`);
        if (!venue.categories || !Array.isArray(venue.categories)) {
          console.log(`❌ Venue ${index + 1} categories not an array:`, venue.categories);
        }
      });
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testFrontendAPI();