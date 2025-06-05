import fetch from 'node-fetch';

async function testCityEndpoint() {
  console.log('Testing /api/cities endpoint...\n');
  
  try {
    const response = await fetch('http://localhost:5001/api/cities');
    const data = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Cities returned:', data.length);
    console.log('\nCity data:');
    data.forEach((city: any) => {
      console.log(`- ${city.name} (${city.slug}) - ${city.timezone}`);
    });
  } catch (error) {
    console.error('Error fetching cities:', error);
  }
}

// Note: Make sure server is running on port 5001
console.log('Make sure server is running on port 5001...');
setTimeout(testCityEndpoint, 2000);