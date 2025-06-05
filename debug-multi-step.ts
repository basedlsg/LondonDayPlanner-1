import dotenv from 'dotenv';
import { processWithGemini } from './server/lib/geminiProcessor.js';

// Load environment variables
dotenv.config();

async function debugMultiStep() {
  const testQuery = "I have a lunch in Mayfair 12 -- would like a place with nice fish. Afterwards I would like to work at a nearby coffee shop. Before going to Chelsea at 7PM to meet some friends for drinks at a cocktail bar -- could you help me choose one?";
  
  console.log('🔍 Debugging multi-step query processing\n');
  console.log('Query:', testQuery);
  console.log('\nEnvironment check:');
  console.log('GEMINI_API_KEY present:', !!process.env.GEMINI_API_KEY);
  console.log('GOOGLE_PLACES_API_KEY present:', !!process.env.GOOGLE_PLACES_API_KEY);
  
  try {
    console.log('\n🚀 Testing Gemini processor directly...');
    const cityContext = { name: 'London', slug: 'london', timezone: 'Europe/London' };
    const result = await processWithGemini(testQuery, undefined, undefined, cityContext);
    
    if (result) {
      console.log('\n✅ Gemini response received:');
      console.log('Fixed Time Entries:', result.fixedTimeEntries?.length || 0);
      console.log('Flexible Time Entries:', result.flexibleTimeEntries?.length || 0);
      console.log('Time Blocks:', result.timeBlocks?.length || 0);
      console.log('Fixed Appointments:', result.fixedAppointments?.length || 0);
      
      console.log('\n📋 Detailed breakdown:');
      if (result.fixedTimeEntries) {
        result.fixedTimeEntries.forEach((entry, i) => {
          console.log(`${i + 1}. ${entry.activity} at ${entry.location} (${entry.time})`);
          if (entry.venuePreference) {
            console.log(`   Venue preference: ${entry.venuePreference}`);
          }
        });
      }
      
      if (result.flexibleTimeEntries) {
        console.log('\nFlexible entries:');
        result.flexibleTimeEntries.forEach((entry, i) => {
          console.log(`${i + 1}. ${entry.activity} at ${entry.location} (${entry.time})`);
        });
      }
      
      if (result.timeBlocks) {
        console.log('\nTime blocks:');
        result.timeBlocks.forEach((block, i) => {
          console.log(`${i + 1}. ${block.activity} from ${block.startTime} to ${block.endTime} at ${block.location}`);
        });
      }
      
    } else {
      console.log('❌ No result from Gemini processor');
    }
    
  } catch (error) {
    console.error('❌ Error testing Gemini processor:', error);
  }
}

debugMultiStep().catch(console.error);