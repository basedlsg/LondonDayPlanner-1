import { saveAs } from 'file-saver';
import { formatInTimeZone } from 'date-fns-tz';

interface Venue {
  name: string;
  time: string;
  address: string;
  rating?: number;
  categories?: string[];
  weather?: any;
  scheduledTime?: string;
}

interface TravelInfo {
  duration: string;
  destination: string;
}

interface ExportOptions {
  venues: Venue[];
  travelInfo?: TravelInfo[];
  title?: string;
  cityName?: string;
  timezone?: string;
  planDate?: string;
  includeTravel?: boolean;
  includeWeather?: boolean;
}

/**
 * Generate a unique event ID for ICS format
 */
function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@londondayplanner.com`;
}

/**
 * Format date for ICS format (YYYYMMDDTHHMMSSZ)
 */
function formatICSDate(date: Date, timezone?: string): string {
  if (timezone) {
    // Format with timezone information
    const formatted = formatInTimeZone(date, timezone, "yyyyMMdd'T'HHmmss");
    return formatted;
  }
  // UTC format
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/**
 * Escape special characters for ICS format
 */
function escapeICS(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

/**
 * Parse time string and create a proper Date object
 */
function parseVenueTime(timeStr: string, planDate?: string): Date {
  const baseDate = planDate ? new Date(planDate) : new Date();
  
  // If we have a full ISO timestamp, use it directly
  if (timeStr.includes('T') || timeStr.includes('Z')) {
    return new Date(timeStr);
  }
  
  // Parse time formats like "2:30 PM" or "14:30"
  const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const isPM = timeMatch[3]?.toUpperCase() === 'PM';
    
    if (timeMatch[3]) { // 12-hour format
      if (isPM && hours < 12) hours += 12;
      if (!isPM && hours === 12) hours = 0;
    }
    
    const date = new Date(baseDate);
    date.setHours(hours, minutes, 0, 0);
    return date;
  }
  
  // Fallback to current time
  return new Date();
}

/**
 * Generate weather description for calendar event
 */
function generateWeatherDescription(weather: any): string {
  if (!weather) return '';
  
  const temp = Math.round(weather.main?.temp || 0);
  const condition = weather.weather?.[0]?.main || 'Unknown';
  const description = weather.weather?.[0]?.description || '';
  
  return `Weather: ${condition} (${temp}°C) - ${description}`;
}

/**
 * Generate ICS calendar file content
 */
export function generateICS(options: ExportOptions): string {
  const {
    venues,
    travelInfo = [],
    title = 'Day Planner Itinerary',
    cityName = 'City',
    timezone = 'UTC',
    planDate,
    includeTravel = true,
    includeWeather = true
  } = options;

  // ICS header
  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//London Day Planner//${cityName}//EN`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICS(title)}`,
    `X-WR-TIMEZONE:${timezone}`,
    'X-WR-CALDESC:Your personalized day itinerary'
  ];

  // Add timezone definition if not UTC
  if (timezone !== 'UTC') {
    icsContent.push(
      'BEGIN:VTIMEZONE',
      `TZID:${timezone}`,
      'END:VTIMEZONE'
    );
  }

  // Process each venue
  venues.forEach((venue, index) => {
    // Parse venue time
    const startTime = venue.scheduledTime 
      ? new Date(venue.scheduledTime)
      : parseVenueTime(venue.time, planDate);
    
    // Default duration: 90 minutes
    let duration = 90;
    
    // Check if we have travel time to next venue
    if (includeTravel && index < venues.length - 1 && travelInfo[index]) {
      const travelDuration = parseInt(travelInfo[index].duration) || 15;
      duration = 90 - travelDuration; // Adjust venue duration to account for travel
    }
    
    const endTime = new Date(startTime.getTime() + duration * 60000);
    
    // Build description
    let description = [];
    
    if (venue.categories && venue.categories.length > 0) {
      description.push(`Categories: ${venue.categories.join(', ')}`);
    }
    
    if (includeWeather && venue.weather) {
      description.push(generateWeatherDescription(venue.weather));
    }
    
    if (venue.weather?.isOutdoor) {
      description.push('Venue type: Outdoor');
      if (!venue.weather?.suitable) {
        description.push('⚠️ Weather conditions may not be ideal for outdoor activities');
      }
    }
    
    // Create venue event
    icsContent.push(
      'BEGIN:VEVENT',
      `UID:${generateEventId()}`,
      `DTSTAMP:${formatICSDate(new Date())}`,
      `DTSTART;TZID=${timezone}:${formatICSDate(startTime, timezone)}`,
      `DTEND;TZID=${timezone}:${formatICSDate(endTime, timezone)}`,
      `SUMMARY:${escapeICS(venue.name)}`,
      `LOCATION:${escapeICS(venue.address || `${cityName}`)}`,
      `DESCRIPTION:${escapeICS(description.join('\\n'))}`,
      'STATUS:CONFIRMED',
      'TRANSP:OPAQUE'
    );
    
    // Add categories as ICS categories
    if (venue.categories && venue.categories.length > 0) {
      icsContent.push(`CATEGORIES:${venue.categories.map(escapeICS).join(',')}`);
    }
    
    icsContent.push('END:VEVENT');
    
    // Add travel event if enabled and available
    if (includeTravel && index < venues.length - 1 && travelInfo[index]) {
      const travelDuration = parseInt(travelInfo[index].duration) || 15;
      const travelStart = new Date(endTime.getTime());
      const travelEnd = new Date(travelStart.getTime() + travelDuration * 60000);
      
      icsContent.push(
        'BEGIN:VEVENT',
        `UID:${generateEventId()}`,
        `DTSTAMP:${formatICSDate(new Date())}`,
        `DTSTART;TZID=${timezone}:${formatICSDate(travelStart, timezone)}`,
        `DTEND;TZID=${timezone}:${formatICSDate(travelEnd, timezone)}`,
        `SUMMARY:🚶 Travel to ${escapeICS(travelInfo[index].destination || venues[index + 1].name)}`,
        `DESCRIPTION:Travel time: ${travelDuration} minutes`,
        'STATUS:CONFIRMED',
        'TRANSP:OPAQUE',
        'CATEGORIES:TRAVEL'
      );
      
      icsContent.push('END:VEVENT');
    }
  });
  
  icsContent.push('END:VCALENDAR');
  
  return icsContent.join('\r\n');
}

/**
 * Export itinerary to ICS file
 */
export function exportToICS(options: ExportOptions): void {
  const icsContent = generateICS(options);
  const blob = new Blob([icsContent], { 
    type: 'text/calendar;charset=utf-8' 
  });
  
  const filename = `${options.cityName || 'day'}-planner-${new Date().toISOString().split('T')[0]}.ics`;
  saveAs(blob, filename.toLowerCase().replace(/\s+/g, '-'));
}

/**
 * Generate Google Calendar URL
 */
export function generateGoogleCalendarUrl(venue: Venue, options: Partial<ExportOptions> = {}): string {
  const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
  
  // Parse times
  const startTime = venue.scheduledTime 
    ? new Date(venue.scheduledTime)
    : parseVenueTime(venue.time, options.planDate);
  const endTime = new Date(startTime.getTime() + 90 * 60000);
  
  // Format dates for Google Calendar (YYYYMMDDTHHmmSSZ)
  const formatGoogleDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };
  
  // Build description
  let details = [];
  if (venue.categories && venue.categories.length > 0) {
    details.push(`Categories: ${venue.categories.join(', ')}`);
  }
  if (venue.weather && options.includeWeather) {
    details.push(generateWeatherDescription(venue.weather));
  }
  details.push(`\n\nCreated by ${options.cityName || ''} Day Planner`);
  
  // Build URL parameters
  const params = new URLSearchParams({
    text: venue.name,
    dates: `${formatGoogleDate(startTime)}/${formatGoogleDate(endTime)}`,
    details: details.join('\n'),
    location: venue.address || '',
    ctz: options.timezone || 'UTC'
  });
  
  return `${baseUrl}&${params.toString()}`;
}

/**
 * Generate mailto link for email sharing
 */
export function generateEmailShareLink(options: ExportOptions): string {
  const subject = `My ${options.cityName || 'Day'} Planner Itinerary`;
  
  let body = [`Here's my planned itinerary for ${options.cityName || 'the day'}:\n`];
  
  options.venues.forEach((venue, index) => {
    body.push(`\n${venue.time} - ${venue.name}`);
    body.push(`📍 ${venue.address}`);
    
    if (venue.categories && venue.categories.length > 0) {
      body.push(`🏷️ ${venue.categories.join(', ')}`);
    }
    
    if (venue.weather?.isOutdoor && options.includeWeather) {
      const temp = Math.round(venue.weather.main?.temp || 0);
      const condition = venue.weather.weather?.[0]?.main || 'Unknown';
      body.push(`🌤️ ${condition} (${temp}°C)`);
    }
    
    if (options.includeTravel && index < options.venues.length - 1 && options.travelInfo?.[index]) {
      body.push(`🚶 ${options.travelInfo[index].duration} min travel to next venue`);
    }
  });
  
  body.push(`\n\nCreated with ${options.cityName || ''} Day Planner`);
  
  const params = new URLSearchParams({
    subject: subject,
    body: body.join('\n')
  });
  
  return `mailto:?${params.toString()}`;
}

/**
 * Copy itinerary text to clipboard
 */
export async function copyItineraryToClipboard(options: ExportOptions): Promise<void> {
  let text = [`${options.title || 'Day Planner Itinerary'}\n`];
  
  options.venues.forEach((venue, index) => {
    text.push(`\n${venue.time} - ${venue.name}`);
    text.push(`📍 ${venue.address}`);
    
    if (options.includeTravel && index < options.venues.length - 1 && options.travelInfo?.[index]) {
      text.push(`⏱️ ${options.travelInfo[index].duration} min to next venue`);
    }
  });
  
  await navigator.clipboard.writeText(text.join('\n'));
}