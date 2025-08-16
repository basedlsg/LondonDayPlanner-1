import fetch from 'node-fetch';

const BASE_URL = 'https://london-day-planner-enftssmnd-basedlsgs-projects.vercel.app';

async function testApi() {
  console.log('--- Test 1: Checking Server Availability (/api/cities) ---');
  try {
    const response = await fetch(`${BASE_URL}/api/cities`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = (await response.json()) as any[];
    console.log('✅ Success! Server is running. Received data:');
    console.log(data[0]); // Log first city to keep it brief
  } catch (error) {
    console.error('❌ Failure! Could not connect to the server.', error);
  }

  console.log('\n--- Test 2: Checking Google Places API Integration (/api/plan) ---');
  try {
    const response = await fetch(`${BASE_URL}/api/plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: "a fun afternoon in London with a museum and a park",
        city: "London",
        preferences: ["museum", "park"]
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as { plan?: { events?: any[] } };

    if (data.plan && data.plan.events && data.plan.events.length > 0) {
      console.log('✅ Success! Google Places API key is working. Received itinerary:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.error('❌ Failure! The API returned an empty or invalid plan. This likely means the Google API key is still being rejected.');
      console.log('Received data:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('❌ Failure! There was an error calling the /api/plan endpoint.', error);
  }
}

testApi();