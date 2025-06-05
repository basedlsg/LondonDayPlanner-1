import { config } from 'dotenv';
import { eq } from 'drizzle-orm';
import { getDb } from './server/db';
import { itineraries } from './shared/schema';

// Load environment variables
config();

async function queryItinerary() {
  console.log('🔍 Testing database connection and querying for itinerary ID 3...\n');
  
  try {
    // Get database instance
    const db = getDb();
    console.log('✅ Database connection established\n');
    
    // Query for itinerary with ID 3
    const result = await db
      .select()
      .from(itineraries)
      .where(eq(itineraries.id, 3))
      .limit(1);
    
    if (result.length === 0) {
      console.log('❌ No itinerary found with ID 3\n');
      return;
    }
    
    const itinerary = result[0];
    console.log('✅ Found itinerary with ID 3:\n');
    console.log('Basic Information:');
    console.log('- ID:', itinerary.id);
    console.log('- Title:', itinerary.title || '(no title)');
    console.log('- Description:', itinerary.description || '(no description)');
    console.log('- Query:', itinerary.query);
    console.log('- Created:', itinerary.created);
    console.log('- Plan Date:', itinerary.planDate || '(no plan date)');
    
    console.log('\nPlaces:', JSON.stringify(itinerary.places, null, 2));
    console.log('\nTravel Times:', JSON.stringify(itinerary.travelTimes, null, 2));
    
  } catch (error) {
    console.error('❌ Error querying database:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  }
}

// Run the query
queryItinerary().then(() => {
  console.log('\n✨ Test complete');
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});