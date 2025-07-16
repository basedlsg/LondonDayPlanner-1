import { getAllCities } from './config/cities/index.js';

console.log('Testing cities configuration...');
const cities = getAllCities();
console.log('\nAvailable cities:');
cities.forEach(city => {
  console.log(`- ${city.name} (${city.slug})`);
});
console.log(`\nTotal cities: ${cities.length}`);