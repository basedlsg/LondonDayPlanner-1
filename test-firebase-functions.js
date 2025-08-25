// Test Firebase Functions locally
const { createServer } = require('./functions/server-adapter.js');

async function testFirebaseFunctions() {
  console.log('Testing Firebase Functions locally...');

  const server = createServer();

  try {
    // Test the plan endpoint
    const result = await server.handlePlanRequest({
      query: 'Visit Central Park',
      date: '2025-01-15',
      startTime: '10:00',
      weatherAware: true
    });

    console.log('✅ Firebase Function test successful!');
    console.log('Result:', JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('❌ Firebase Function test failed:', error.message);
    console.error('Full error:', error);
  }
}

if (require.main === module) {
  testFirebaseFunctions();
}

module.exports = { testFirebaseFunctions };
