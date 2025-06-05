import { setupEnvironment } from './lib/environment.js';
import { getAllCities, getCityConfig } from './config/cities/index.js';
import { CityConfigService } from './services/CityConfigService.js';
import { searchPlace } from './lib/googlePlaces.js';

async function testCityFeatures() {
  console.log('🧪 Testing City-Specific Features...\n');
  
  setupEnvironment();
  
  const cities = getAllCities();
  console.log(`Found ${cities.length} cities: ${cities.map(c => c.name).join(', ')}\n`);
  
  for (const city of cities) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Testing ${city.name} (${city.slug})`);
    console.log('='.repeat(50));
    
    // 1. Test basic config
    console.log('\n1. Basic Configuration:');
    console.log(`   Timezone: ${city.timezone}`);
    console.log(`   Default Location: ${city.defaultLocation.lat}, ${city.defaultLocation.lng}`);
    console.log(`   Major Areas: ${city.majorAreas.map(a => a.name).join(', ')}`);
    console.log(`   Transport Modes: ${city.transportModes.join(', ')}`);
    
    // 2. Test business categories
    console.log('\n2. Business Categories:');
    const categories = Object.keys(city.businessCategories);
    console.log(`   Available: ${categories.join(', ')}`);
    console.log(`   Restaurant types: ${city.businessCategories.restaurant}`);
    console.log(`   Coffee types: ${city.businessCategories.coffee}`);
    
    // 3. Test currency and pricing
    console.log('\n3. Currency & Pricing:');
    const currency = city.slug === 'london' ? '£' : '$';
    console.log(`   Currency: ${currency}`);
    
    // 4. Test area data loading
    console.log('\n4. Area Data:');
    const cityService = new CityConfigService();
    const fullConfig = cityService.getCityConfigWithDetails(city.slug);
    console.log(`   Detailed areas loaded: ${fullConfig?.detailedAreas?.length || 0}`);
    if (fullConfig?.detailedAreas && fullConfig.detailedAreas.length > 0) {
      console.log(`   Sample areas: ${fullConfig.detailedAreas.slice(0, 3).map(a => a.name).join(', ')}`);
    }
    
    // 5. Test a sample place search (skip if no API key)
    if (process.env.GOOGLE_PLACES_API_KEY) {
      console.log('\n5. Sample Place Search:');
      try {
        const searchQuery = city.businessCategories.restaurant[0] || 'restaurant';
        const result = await searchPlace(
          searchQuery,
          city.slug,
          city.defaultLocation.lat,
          city.defaultLocation.lng
        );
        console.log(`   Search for "${searchQuery}": ${result ? 'Found' : 'Not found'}`);
        if (result) {
          console.log(`   Example: ${result.name}`);
        }
      } catch (error) {
        console.log(`   Search error: ${error.message}`);
      }
    }
  }
  
  console.log('\n\n✅ City features test completed!');
}

testCityFeatures().catch(console.error);