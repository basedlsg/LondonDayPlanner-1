import dotenv from 'dotenv';
dotenv.config(); // Load environment variables first

import { GoogleGenerativeAI } from '@google/generative-ai';

async function testGeminiDirectly() {
  const testQuery = "I have a lunch in Mayfair 12 -- would like a place with nice fish. Afterwards I would like to work at a nearby coffee shop. Before going to Chelsea at 7PM to meet some friends for drinks at a cocktail bar -- could you help me choose one?";
  
  console.log('🔍 Testing Gemini directly to identify parsing issues\n');
  console.log('Query:', testQuery);
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found in environment');
    return;
  }
  
  console.log('✅ GEMINI_API_KEY found, length:', apiKey.length);
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
    
    const prompt = `
    You are an expert travel planning assistant for London. Extract structured information from this itinerary request with extreme attention to detail.
    
    CRITICAL PARSING RULES:
    
    1. JSON FORMAT: Return ONLY valid JSON matching the schema - no markdown, no extra text
    
    2. TIME EXTRACTION:
       - Use 24-hour format (e.g., "09:00", "15:30")
       - "at 12" for lunch = "12:00" 
       - "at 7PM" = "19:00"
       - Default meal times: breakfast="09:00", lunch="12:00", dinner="19:00"
    
    3. ACTIVITY SEQUENCE - CRITICAL:
       - Preserve the EXACT order mentioned by the user
       - "then", "after that", "afterwards", "before going to" indicate sequence
       - Count ALL activities mentioned (lunch, work, drinks, etc.)
       - Each distinct activity should be a separate entry
    
    4. LOCATION INTELLIGENCE - CRITICAL:
       - PRESERVE ALL LOCATION MENTIONS from the user's query!
       - "Mayfair" stays "Mayfair"
       - "nearby" means close to the previous location
       - "Chelsea" stays "Chelsea"
    
    5. VENUE PREFERENCES - CRITICAL:
       - ALWAYS extract venue descriptors to venuePreference field
       - "place with nice fish" → venuePreference: "seafood restaurant"
       - "coffee shop" → venuePreference: "coffee shop"  
       - "cocktail bar" → venuePreference: "cocktail bar"
    
    SCHEMA STRUCTURE:
    {
      "fixedTimeEntries": [
        {
          "time": "HH:MM",
          "activity": "Brief description",
          "location": "London location",
          "venuePreference": "specific venue type if mentioned",
          "searchParameters": {
            "venuePreference": "DUPLICATE venue preference here",
            "specificRequirements": ["array of requirements"],
            "cuisine": "if food related",
            "priceLevel": "budget/moderate/expensive"
          }
        }
      ]
    }

    IMPORTANT: Count ALL activities in this request and ensure each one appears in the output.
    
    Here's the request to analyze:
    ${testQuery}
    `;
    
    console.log('\n🚀 Sending to Gemini...');
    
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024,
      },
    });
    
    const response = result.response;
    const responseText = response.text();
    
    console.log('\n📋 Raw Gemini Response:');
    console.log(responseText);
    
    // Try to extract and parse JSON
    let jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                   responseText.match(/```\n([\s\S]*?)\n```/) ||
                   responseText.match(/\{[\s\S]*\}/);
                   
    let jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : responseText;
    
    // Clean up any trailing commas
    jsonText = jsonText.replace(/,\s*([}\]])/g, '$1');
    
    try {
      const parsedData = JSON.parse(jsonText);
      console.log('\n✅ Parsed JSON:');
      console.log(JSON.stringify(parsedData, null, 2));
      
      // Count activities
      const activityCount = (parsedData.fixedTimeEntries?.length || 0) + 
                           (parsedData.flexibleTimeEntries?.length || 0) + 
                           (parsedData.timeBlocks?.length || 0);
      
      console.log('\n📊 Activity Analysis:');
      console.log('Total activities found:', activityCount);
      console.log('Expected activities: 3 (lunch, coffee shop, cocktail bar)');
      
      if (parsedData.fixedTimeEntries) {
        console.log('\n📝 Fixed Time Entries:');
        parsedData.fixedTimeEntries.forEach((entry: any, i: number) => {
          console.log(`${i + 1}. ${entry.activity} at ${entry.location} (${entry.time})`);
          if (entry.venuePreference) {
            console.log(`   Venue preference: ${entry.venuePreference}`);
          }
        });
      }
      
    } catch (parseError) {
      console.error('❌ Failed to parse JSON response:', parseError);
      console.log('Raw response to debug:', responseText);
    }
    
  } catch (error) {
    console.error('❌ Error calling Gemini API:', error);
  }
}

testGeminiDirectly().catch(console.error);