// Debug script to check place details in database
import { db } from './server/db.ts';
import { places } from './shared/schema.ts';

async function debugPlaceDetails() {
  try {
    console.log('🔍 Fetching places from database...');
    
    // Get all places from database
    const allPlaces = await db.select().from(places).limit(5);
    console.log(`Found ${allPlaces.length} places in database`);
    
    for (const place of allPlaces) {
      console.log('\n=== PLACE DEBUG ===');
      console.log('ID:', place.id);
      console.log('Name:', place.name);
      console.log('Place ID:', place.placeId);
      console.log('Address:', place.address);
      console.log('Has Details:', !!place.details);
      console.log('Details type:', typeof place.details);
      console.log('Details keys:', place.details ? Object.keys(place.details) : 'N/A');
      
      if (place.details) {
        console.log('Details content:');
        console.log('  Rating:', place.details.rating);
        console.log('  Types:', place.details.types);
        console.log('  Price Level:', place.details.price_level);
        console.log('  Full details:', JSON.stringify(place.details, null, 2));
      } else {
        console.log('❌ NO DETAILS STORED');
      }
    }
    
  } catch (error) {
    console.error('Error debugging place details:', error);
  }
}

debugPlaceDetails();