import axios from 'axios';
import crypto from 'crypto';

// Realistic distribution (not equal) - London gets more as it's the main city
const cityDistribution = {
  london: 0.40,  // 40% - 141 queries
  nyc: 0.25,     // 25% - 88 queries
  boston: 0.20,  // 20% - 70 queries
  austin: 0.15   // 15% - 53 queries
};

// Query templates for realistic variations
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
      "Brunch places in {area}",
      "Theatre shows this evening",
      "Markets to explore today"
    ],
    multi: [
      "Morning coffee in {area1}, lunch in {area2}, then museums",
      "Start at {landmark}, lunch nearby, then shopping in {area}",
      "Breakfast in {area1}, walk through {park}, dinner in {area2}",
      "Museums in the morning, lunch in {area}, theatre tonight",
      "Shopping in {area1}, afternoon tea, then galleries in {area2}",
      "Morning markets, lunch in {area}, evening at {landmark}",
      "Start with breakfast in {area1}, explore {landmark}, dinner in {area2}",
      "Coffee and bookshops in {area1}, lunch, then {park} walk"
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
      "Art galleries in {area}",
      "Ramen spots in {area}",
      "Comedy shows this weekend",
      "Brunch in {area}"
    ],
    multi: [
      "Morning in {park}, lunch in {area1}, shopping in {area2}",
      "Breakfast in {area1}, {landmark} visit, dinner in {area2}",
      "Museums morning, lunch in {area}, Broadway show tonight",
      "Coffee in {area1}, Central Park walk, dinner in {area2}",
      "Shopping in {area1}, lunch break, galleries in {area2}",
      "Bagels in {area1}, explore {landmark}, cocktails in {area2}",
      "Morning jog in {park}, brunch in {area}, afternoon museums"
    ]
  },
  boston: {
    single: [
      "Seafood restaurants near {landmark}",
      "Coffee shops in {area}",
      "Historic sites to visit",
      "Parks for walking",
      "Breweries in {area}",
      "Bookstores near campus",
      "Italian food in {area}",
      "Museums open today",
      "Running routes near {park}",
      "Lunch spots in {area}"
    ],
    multi: [
      "Freedom Trail walk, lunch in {area}, harbor cruise",
      "Morning coffee in {area1}, museums, dinner in {area2}",
      "Breakfast in {area1}, {park} visit, seafood dinner",
      "Shopping in {area1}, lunch break, breweries in {area2}",
      "Campus tour, lunch in {area}, evening at {landmark}",
      "Morning run in {park}, brunch in {area1}, afternoon shopping"
    ]
  },
  austin: {
    single: [
      "BBQ restaurants in {area}",
      "Live music venues on {street}",
      "Coffee shops in {area}",
      "Food trucks near {landmark}",
      "Hiking trails nearby",
      "Breweries in {area}",
      "Taco spots for lunch",
      "Swimming holes to visit",
      "Vintage shops in {area}",
      "Bars with live music"
    ],
    multi: [
      "Morning hike, lunch at food trucks, evening on {street}",
      "Breakfast tacos in {area1}, shopping, BBQ dinner in {area2}",
      "Coffee in {area1}, {park} visit, live music tonight",
      "Swimming morning, lunch in {area}, brewery tour",
      "Food truck tour, afternoon shopping in {area}, music venue",
      "Morning at {landmark}, lunch in {area1}, sunset at {park}"
    ]
  }
};

// Location data for each city
const locations = {
  london: {
    areas: ["Soho", "Shoreditch", "Notting Hill", "Camden", "Covent Garden", "Chelsea", "Brixton", "Hackney", "Islington", "Greenwich", "Clapham", "Fulham"],
    landmarks: ["Tower Bridge", "Big Ben", "Buckingham Palace", "British Museum", "Tate Modern", "London Eye", "Tower of London", "St Paul's Cathedral"],
    parks: ["Hyde Park", "Regent's Park", "Hampstead Heath", "Richmond Park", "Greenwich Park"]
  },
  nyc: {
    areas: ["SoHo", "Williamsburg", "East Village", "Upper West Side", "Chelsea", "Tribeca", "Lower East Side", "Greenwich Village", "Midtown", "Brooklyn Heights", "Astoria", "Park Slope"],
    landmarks: ["Times Square", "Empire State Building", "Brooklyn Bridge", "Statue of Liberty", "One World Trade", "Rockefeller Center", "High Line"],
    parks: ["Central Park", "Prospect Park", "Bryant Park", "Washington Square Park", "Brooklyn Bridge Park"]
  },
  boston: {
    areas: ["Back Bay", "North End", "Cambridge", "South End", "Beacon Hill", "Fenway", "Seaport", "Allston", "Jamaica Plain", "Somerville"],
    landmarks: ["Fenway Park", "Freedom Trail", "Boston Common", "Faneuil Hall", "USS Constitution", "Boston Harbor"],
    parks: ["Boston Common", "Public Garden", "Esplanade", "Franklin Park", "Arnold Arboretum"]
  },
  austin: {
    areas: ["Downtown", "South Congress", "East Austin", "Domain", "Zilker", "Mueller", "West Campus", "Hyde Park", "Clarksville", "Rainey Street"],
    landmarks: ["Capitol Building", "Barton Springs", "Zilker Park", "Lake Travis", "Mount Bonnell", "6th Street"],
    parks: ["Zilker Park", "Lady Bird Lake", "Barton Creek Greenbelt", "McKinney Falls"],
    streets: ["6th Street", "Rainey Street", "South Congress", "East 6th", "Red River"]
  }
};

// Time preferences
const timePreferences = [
  "", // No time specified
  "morning",
  "afternoon", 
  "evening",
  "tonight",
  "this weekend",
  "tomorrow",
  "today"
];

// Budget preferences
const budgetPreferences = [
  "", // No budget specified
  "budget-friendly",
  "cheap eats",
  "upscale",
  "mid-range",
  "free activities",
  "luxury"
];

// Weather preferences
const weatherPreferences = [
  "", // No weather specified
  "rainy day",
  "sunny day",
  "indoor activities",
  "outdoor activities"
];

// Group types
const groupTypes = [
  "", // No group specified
  "solo",
  "couple",
  "family with kids",
  "group of friends",
  "date night",
  "business meeting"
];

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
  const isMulti = Math.random() < 0.4; // 40% chance of multi-step query
  
  let baseQuery;
  if (isMulti && templates.multi) {
    baseQuery = fillTemplate(getRandomElement(templates.multi), city);
  } else {
    baseQuery = fillTemplate(getRandomElement(templates.single), city);
  }
  
  // Add optional modifiers
  const modifiers = [];
  
  // 30% chance to add time preference
  if (Math.random() < 0.3) {
    const time = getRandomElement(timePreferences);
    if (time) modifiers.push(time);
  }
  
  // 20% chance to add budget preference
  if (Math.random() < 0.2) {
    const budget = getRandomElement(budgetPreferences);
    if (budget) modifiers.push(budget);
  }
  
  // 15% chance to add weather preference
  if (Math.random() < 0.15) {
    const weather = getRandomElement(weatherPreferences);
    if (weather) modifiers.push(weather);
  }
  
  // 25% chance to add group type
  if (Math.random() < 0.25) {
    const group = getRandomElement(groupTypes);
    if (group) modifiers.push(group);
  }
  
  // Combine query with modifiers
  if (modifiers.length > 0) {
    return `${baseQuery} - ${modifiers.join(', ')}`;
  }
  
  return baseQuery;
}

async function generateItineraries() {
  const API_BASE = 'http://localhost:8080/api';
  const queries = [];
  
  // Calculate number of queries per city
  const cityCounts = {
    london: Math.round(352 * cityDistribution.london),
    nyc: Math.round(352 * cityDistribution.nyc),
    boston: Math.round(352 * cityDistribution.boston),
    austin: Math.round(352 * cityDistribution.austin)
  };
  
  // Adjust for rounding errors
  const total = Object.values(cityCounts).reduce((a, b) => a + b, 0);
  if (total < 352) {
    cityCounts.london += 352 - total;
  }
  
  console.log('Generating queries with distribution:', cityCounts);
  
  // Generate queries for each city
  for (const [city, count] of Object.entries(cityCounts)) {
    for (let i = 0; i < count; i++) {
      queries.push({
        city,
        query: generateQuery(city),
        userId: generateRandomString(12)
      });
    }
  }
  
  // Shuffle queries to mix cities
  for (let i = queries.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queries[i], queries[j]] = [queries[j], queries[i]];
  }
  
  console.log(`Starting to generate ${queries.length} itineraries...`);
  
  // Process queries with rate limiting
  const batchSize = 2; // Smaller batch size
  const delayBetweenBatches = 10000; // 10 seconds between batches
  
  for (let i = 0; i < queries.length; i += batchSize) {
    const batch = queries.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async ({ city, query, userId }, batchIndex) => {
      let attempts = 0;
      const maxAttempts = 3;
      const retryDelay = 5000; // 5 seconds
      
      while (attempts < maxAttempts) {
        try {
          const response = await axios.post(`${API_BASE}/plan`, {
            query,
            city,
            preferences: {
              userId: userId
            }
          });
          
          console.log(`✓ [${i + batchIndex + 1}/${queries.length}] Generated: "${query}" in ${city}`);
          return response.data;
        } catch (error) {
          attempts++;
          if (error.response?.status === 500 && attempts < maxAttempts) {
            console.log(`⟳ Retry ${attempts}/${maxAttempts} for: "${query}" in ${city}`);
            await new Promise(resolve => setTimeout(resolve, retryDelay * attempts));
          } else {
            console.error(`✗ Failed after ${attempts} attempts: "${query}" in ${city}:`, error.message);
            return null;
          }
        }
      }
    });
    
    await Promise.all(batchPromises);
    
    if (i + batchSize < queries.length) {
      console.log(`Waiting ${delayBetweenBatches}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }
  
  console.log('\n✅ Generation complete!');
}

// Run the generation
generateItineraries().catch(console.error);