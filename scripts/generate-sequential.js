import axios from 'axios';
import crypto from 'crypto';

// Use the same configuration as before
const cityDistribution = {
  london: 0.40,  // 40% - 141 queries
  nyc: 0.25,     // 25% - 88 queries
  boston: 0.20,  // 20% - 70 queries
  austin: 0.15   // 15% - 53 queries
};

const queryTemplates = {
  london: {
    single: [
      "Best coffee shops in {area}",
      "Art galleries near {landmark}",
      "Lunch spots in {area}",
      "Museums to visit today",
      "Parks for a morning walk",
      "Bookshops in {area}",
      "Historic pubs near {landmark}",
      "Vintage shopping in {area}",
      "Live music venues tonight",
      "Brunch places in {area}"
    ],
    multi: [
      "Morning coffee in {area1}, lunch in {area2}, then museums",
      "Start at {landmark}, lunch nearby, then shopping in {area}",
      "Breakfast in {area1}, walk through {park}, dinner in {area2}",
      "Museums in the morning, lunch in {area}, theatre tonight"
    ]
  },
  nyc: {
    single: [
      "Pizza places in {area}",
      "Rooftop bars in {area}",
      "Museums near {landmark}",
      "Coffee shops in {area}",
      "Parks for jogging",
      "Bagel shops for breakfast",
      "Jazz clubs tonight",
      "Art galleries in {area}"
    ],
    multi: [
      "Morning in {park}, lunch in {area1}, shopping in {area2}",
      "Breakfast in {area1}, {landmark} visit, dinner in {area2}",
      "Museums morning, lunch in {area}, Broadway show tonight"
    ]
  },
  boston: {
    single: [
      "Seafood restaurants near {landmark}",
      "Coffee shops in {area}",
      "Historic sites to visit",
      "Parks for walking",
      "Breweries in {area}",
      "Italian food in {area}"
    ],
    multi: [
      "Freedom Trail walk, lunch in {area}, harbor cruise",
      "Morning coffee in {area1}, museums, dinner in {area2}"
    ]
  },
  austin: {
    single: [
      "BBQ restaurants in {area}",
      "Live music venues on {street}",
      "Coffee shops in {area}",
      "Food trucks near {landmark}",
      "Hiking trails nearby",
      "Breweries in {area}"
    ],
    multi: [
      "Morning hike, lunch at food trucks, evening on {street}",
      "Breakfast tacos in {area1}, shopping, BBQ dinner in {area2}"
    ]
  }
};

const locations = {
  london: {
    areas: ["Soho", "Shoreditch", "Notting Hill", "Camden", "Covent Garden", "Chelsea", "Brixton"],
    landmarks: ["Tower Bridge", "Big Ben", "British Museum", "Tate Modern"],
    parks: ["Hyde Park", "Regent's Park", "Hampstead Heath"]
  },
  nyc: {
    areas: ["SoHo", "Williamsburg", "East Village", "Upper West Side", "Chelsea", "Tribeca"],
    landmarks: ["Times Square", "Empire State Building", "Brooklyn Bridge", "Central Park"],
    parks: ["Central Park", "Prospect Park", "Bryant Park"]
  },
  boston: {
    areas: ["Back Bay", "North End", "Cambridge", "South End", "Beacon Hill"],
    landmarks: ["Fenway Park", "Freedom Trail", "Boston Common"],
    parks: ["Boston Common", "Public Garden"]
  },
  austin: {
    areas: ["Downtown", "South Congress", "East Austin", "Domain"],
    landmarks: ["Capitol Building", "Barton Springs"],
    parks: ["Zilker Park", "Lady Bird Lake"],
    streets: ["6th Street", "Rainey Street"]
  }
};

function generateRandomString(length = 8) {
  return crypto.randomBytes(length).toString('hex');
}

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fillTemplate(template, city) {
  const loc = locations[city];
  return template
    .replace(/{area}/g, getRandomElement(loc.areas))
    .replace(/{area1}/g, getRandomElement(loc.areas))
    .replace(/{area2}/g, getRandomElement(loc.areas))
    .replace(/{landmark}/g, getRandomElement(loc.landmarks))
    .replace(/{park}/g, getRandomElement(loc.parks))
    .replace(/{street}/g, loc.streets ? getRandomElement(loc.streets) : getRandomElement(loc.areas));
}

function generateQuery(city) {
  const templates = queryTemplates[city];
  const isMulti = Math.random() < 0.3; // 30% chance of multi-step query
  
  let baseQuery;
  if (isMulti && templates.multi) {
    baseQuery = fillTemplate(getRandomElement(templates.multi), city);
  } else {
    baseQuery = fillTemplate(getRandomElement(templates.single), city);
  }
  
  return baseQuery;
}

async function generateItinerariesSequentially() {
  const API_BASE = 'http://localhost:8080/api';
  const totalQueries = 352;
  let successCount = 0;
  let failCount = 0;
  
  // Calculate queries per city
  const cityCounts = {
    london: Math.round(totalQueries * cityDistribution.london),
    nyc: Math.round(totalQueries * cityDistribution.nyc),
    boston: Math.round(totalQueries * cityDistribution.boston),
    austin: Math.round(totalQueries * cityDistribution.austin)
  };
  
  console.log('Generating queries with distribution:', cityCounts);
  
  // Generate all queries
  const queries = [];
  for (const [city, count] of Object.entries(cityCounts)) {
    for (let i = 0; i < count; i++) {
      queries.push({
        city,
        query: generateQuery(city),
        userId: generateRandomString(12)
      });
    }
  }
  
  // Shuffle for random distribution
  for (let i = queries.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queries[i], queries[j]] = [queries[j], queries[i]];
  }
  
  console.log(`\nGenerating ${queries.length} itineraries sequentially...\n`);
  
  // Process one by one with delay
  for (let i = 0; i < queries.length; i++) {
    const { city, query, userId } = queries[i];
    
    try {
      const response = await axios.post(`${API_BASE}/plan`, {
        query,
        city,
        preferences: {
          userId: userId
        }
      });
      
      successCount++;
      console.log(`✓ [${i + 1}/${queries.length}] Success (${successCount} total): "${query}" in ${city}`);
      
      // Wait 3 seconds between successful requests
      await new Promise(resolve => setTimeout(resolve, 3000));
      
    } catch (error) {
      failCount++;
      console.error(`✗ [${i + 1}/${queries.length}] Failed (${failCount} total): "${query}" in ${city}`);
      
      // If rate limited, wait longer
      if (error.response?.status === 500 || error.response?.status === 429) {
        console.log('⏳ Rate limited. Waiting 30 seconds...');
        await new Promise(resolve => setTimeout(resolve, 30000));
      } else {
        // Regular failure, wait 5 seconds
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    // Progress update every 10 queries
    if ((i + 1) % 10 === 0) {
      console.log(`\n📊 Progress: ${i + 1}/${queries.length} (${Math.round((i + 1) / queries.length * 100)}%) - Success: ${successCount}, Failed: ${failCount}\n`);
    }
  }
  
  console.log('\n✅ Generation complete!');
  console.log(`📊 Final stats: ${successCount} successful, ${failCount} failed out of ${queries.length} total`);
}

// Run the generation
generateItinerariesSequentially().catch(console.error);