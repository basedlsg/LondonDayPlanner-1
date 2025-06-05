// Test venue variety implementation
import fetch from 'node-fetch';

async function testVenueVariety() {
  const queries = [
    "I want to have lunch in Greenwich Village at 1pm and then see a show in Times Square at 7pm",
    "Coffee in SoHo at 10am and dinner in Chelsea at 8pm",
    "Breakfast in Midtown at 9am and drinks in Brooklyn at 9pm"
  ];

  console.log('Testing venue variety across multiple generations...\n');

  for (const query of queries) {
    console.log(`\nTesting query: "${query}"`);
    console.log('Making 3 requests to check venue variety:');
    
    const venues = new Set();
    const results = [];
    
    for (let i = 0; i < 3; i++) {
      try {
        const response = await fetch('http://localhost:5001/api/nyc/plan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query: query + ` ${Math.random()}`, // Add random number to bust cache
            date: new Date().toISOString().split('T')[0],
            startTime: '09:00'
          })
        });

        if (!response.ok) {
          console.error(`Request ${i + 1} failed with status:`, response.status);
          const text = await response.text();
          console.error('Response:', text.substring(0, 200));
          continue;
        }
        
        const data = await response.json();
        console.log(`Request ${i + 1} response:`, JSON.stringify(data).substring(0, 200));
        
        if (data.venues && data.venues.length > 0) {
          const itineraryVenues = data.venues.map(venue => ({
            name: venue.name || 'Unknown',
            placeId: venue.placeId
          }));
          
          results.push(itineraryVenues);
          itineraryVenues.forEach(v => venues.add(v.name));
        } else if (data.places && data.places.length > 0) {
          const itineraryVenues = data.places.map(place => ({
            name: place.name || 'Unknown', 
            placeId: place.placeId
          }));
          
          results.push(itineraryVenues);
          itineraryVenues.forEach(v => venues.add(v.name));
        }
        
        // Add small delay between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Request ${i + 1} failed:`, error.message);
      }
    }
    
    console.log(`\nUnique venues found: ${venues.size}`);
    console.log('Venues:', Array.from(venues).join(', '));
    
    // Show variation analysis
    if (results.length >= 2) {
      let variations = 0;
      for (let i = 0; i < results[0].length; i++) {
        const venuesAtPosition = new Set(results.map(r => r[i]?.name).filter(Boolean));
        if (venuesAtPosition.size > 1) variations++;
      }
      console.log(`Positions with venue variation: ${variations}/${results[0].length}`);
    }
  }
}

testVenueVariety().catch(console.error);