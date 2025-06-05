import { generateICS, generateGoogleCalendarUrl, generateEmailShareLink } from './calendarExport';

// Test data
const testVenues = [
  {
    name: 'Central Park',
    time: '10:00 AM',
    address: 'Central Park, New York, NY',
    categories: ['park', 'tourist_attraction'],
    weather: {
      main: { temp: 22, feels_like: 24, humidity: 60 },
      weather: [{ main: 'Clear', description: 'clear sky', icon: '01d' }],
      dt: Date.now() / 1000,
      isOutdoor: true,
      suitable: true
    }
  },
  {
    name: 'MoMA',
    time: '2:00 PM',
    address: '11 W 53rd St, New York, NY 10019',
    categories: ['museum', 'art_gallery'],
    weather: undefined
  }
];

const testTravelInfo = [
  {
    duration: '15',
    destination: 'MoMA'
  }
];

describe('Calendar Export Functions', () => {
  test('generateICS creates valid ICS content', () => {
    const ics = generateICS({
      venues: testVenues,
      travelInfo: testTravelInfo,
      title: 'NYC Day Trip',
      cityName: 'New York',
      timezone: 'America/New_York',
      includeTravel: true,
      includeWeather: true
    });

    // Check ICS structure
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('PRODID:-//London Day Planner//New York//EN');
    
    // Check venues are included
    expect(ics).toContain('SUMMARY:Central Park');
    expect(ics).toContain('SUMMARY:MoMA');
    expect(ics).toContain('LOCATION:Central Park, New York, NY');
    
    // Check travel event
    expect(ics).toContain('🚶 Travel to MoMA');
    expect(ics).toContain('Travel time: 15 minutes');
    
    // Check weather info
    expect(ics).toContain('Weather: Clear (22°C)');
    expect(ics).toContain('Venue type: Outdoor');
  });

  test('generateGoogleCalendarUrl creates valid URL', () => {
    const url = generateGoogleCalendarUrl(testVenues[0], {
      cityName: 'New York',
      timezone: 'America/New_York',
      includeWeather: true
    });

    // Check URL structure
    expect(url).toContain('https://calendar.google.com/calendar/render');
    expect(url).toContain('action=TEMPLATE');
    expect(url).toContain('text=Central+Park');
    expect(url).toContain('location=Central+Park%2C+New+York%2C+NY');
    expect(url).toContain('ctz=America%2FNew_York');
    
    // Check details include weather
    expect(url).toContain('Weather%3A+Clear');
  });

  test('generateEmailShareLink creates valid mailto', () => {
    const mailto = generateEmailShareLink({
      venues: testVenues,
      travelInfo: testTravelInfo,
      cityName: 'New York',
      includeTravel: true,
      includeWeather: true
    });

    // Check mailto structure
    expect(mailto).toContain('mailto:?');
    expect(mailto).toContain('subject=My+New+York+Day+Planner+Itinerary');
    
    // Decode to check content
    const decoded = decodeURIComponent(mailto);
    expect(decoded).toContain('Central Park');
    expect(decoded).toContain('MoMA');
    expect(decoded).toContain('15 min travel to next venue');
    expect(decoded).toContain('Clear (22°C)');
  });

  test('handles venues without weather data', () => {
    const ics = generateICS({
      venues: [testVenues[1]], // MoMA without weather
      title: 'Museum Visit',
      cityName: 'New York',
      timezone: 'America/New_York'
    });

    expect(ics).toContain('SUMMARY:MoMA');
    expect(ics).not.toContain('Weather:');
    expect(ics).not.toContain('Venue type:');
  });

  test('escapes special characters in ICS', () => {
    const venueWithSpecialChars = {
      name: 'Joe\'s Pizza; Best in Town',
      time: '12:00 PM',
      address: '7 Carmine St, New York, NY',
      categories: ['restaurant']
    };

    const ics = generateICS({
      venues: [venueWithSpecialChars],
      cityName: 'New York'
    });

    expect(ics).toContain('SUMMARY:Joe\'s Pizza\\; Best in Town');
  });
});