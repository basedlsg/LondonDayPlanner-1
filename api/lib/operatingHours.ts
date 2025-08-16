// @ts-nocheck
/**
 * Operating Hours Validation Utilities
 * 
 * This module provides functions to validate venue operating hours
 * and determine if a venue is open at a specific time.
 */

import { PlaceDetails } from './googlePlaces';
import { formatInTimeZone } from 'date-fns-tz';

export interface OpeningHours {
  periods?: {
    close?: {
      day: number;
      time: string;
    };
    open: {
      day: number;
      time: string;
    };
  }[];
  weekday_text?: string[];
  open_now?: boolean;
}

export interface OperatingHoursValidation {
  isOpen: boolean;
  opensAt?: string;
  closesAt?: string;
  reason: string;
  confidence: 'high' | 'medium' | 'low' | 'unknown';
}

/**
 * Validates if a venue is open at a specific date and time
 */
export function validateOperatingHours(
  place: PlaceDetails,
  scheduledDateTime: Date,
  timezone: string = 'America/New_York'
): OperatingHoursValidation {
  console.log(`🕒 [Operating Hours] Validating hours for ${place.name} at ${scheduledDateTime.toISOString()}`);
  
  // Check if we have opening hours data
  if (!place.opening_hours) {
    console.log(`⚠️ [Operating Hours] No opening hours data for ${place.name}`);
    return {
      isOpen: true, // Assume open if no data
      reason: 'No operating hours data available',
      confidence: 'unknown'
    };
  }

  const openingHours = place.opening_hours as OpeningHours;

  // Use open_now as a quick check if available
  if (openingHours.open_now !== undefined) {
    const now = new Date();
    const timeDiff = Math.abs(scheduledDateTime.getTime() - now.getTime());
    const isWithinHour = timeDiff < 60 * 60 * 1000; // Within 1 hour
    
    if (isWithinHour) {
      return {
        isOpen: openingHours.open_now,
        reason: openingHours.open_now ? 'Currently open' : 'Currently closed',
        confidence: 'high'
      };
    }
  }

  // Get day of week (0 = Sunday, 1 = Monday, etc.)
  const scheduledInTimezone = formatInTimeZone(scheduledDateTime, timezone, 'yyyy-MM-dd HH:mm:ss EEEE');
  const dayOfWeek = scheduledDateTime.getDay();
  const timeInTimezone = formatInTimeZone(scheduledDateTime, timezone, 'HHmm');
  
  console.log(`📅 [Operating Hours] Scheduled: ${scheduledInTimezone}, Day: ${dayOfWeek}, Time: ${timeInTimezone}`);

  // Check periods if available
  if (openingHours.periods && openingHours.periods.length > 0) {
    for (const period of openingHours.periods) {
      if (period.open.day === dayOfWeek) {
        const openTime = period.open.time;
        const closeTime = period.close?.time;
        
        console.log(`🕰️ [Operating Hours] Found period for day ${dayOfWeek}: opens ${openTime}, closes ${closeTime || 'late/unknown'}`);
        
        if (!closeTime) {
          // Open 24 hours or until late
          return {
            isOpen: parseInt(timeInTimezone) >= parseInt(openTime),
            opensAt: formatTime(openTime),
            reason: `Opens at ${formatTime(openTime)}`,
            confidence: 'high'
          };
        }
        
        const scheduledTime = parseInt(timeInTimezone);
        const openHour = parseInt(openTime);
        const closeHour = parseInt(closeTime);
        
        // Handle cases where close time is next day (e.g., opens 22:00, closes 02:00)
        if (closeHour < openHour) {
          // Venue closes after midnight
          const isOpen = scheduledTime >= openHour || scheduledTime <= closeHour;
          return {
            isOpen,
            opensAt: formatTime(openTime),
            closesAt: formatTime(closeTime),
            reason: isOpen 
              ? `Open from ${formatTime(openTime)} to ${formatTime(closeTime)} (next day)`
              : `Closed (opens at ${formatTime(openTime)})`,
            confidence: 'high'
          };
        } else {
          // Normal day hours
          const isOpen = scheduledTime >= openHour && scheduledTime <= closeHour;
          return {
            isOpen,
            opensAt: formatTime(openTime),
            closesAt: formatTime(closeTime),
            reason: isOpen 
              ? `Open from ${formatTime(openTime)} to ${formatTime(closeTime)}`
              : `Closed (opens at ${formatTime(openTime)})`,
            confidence: 'high'
          };
        }
      }
    }
    
    // No period found for this day - might be closed
    return {
      isOpen: false,
      reason: `Closed on ${getDayName(dayOfWeek)}`,
      confidence: 'medium'
    };
  }

  // Fall back to weekday_text parsing if available
  if (openingHours.weekday_text && openingHours.weekday_text.length > 0) {
    const dayText = openingHours.weekday_text[dayOfWeek];
    if (dayText) {
      console.log(`📝 [Operating Hours] Using weekday text: ${dayText}`);
      
      // Parse common patterns
      if (dayText.toLowerCase().includes('closed')) {
        return {
          isOpen: false,
          reason: `Closed on ${getDayName(dayOfWeek)}`,
          confidence: 'medium'
        };
      }
      
      // Try to extract hours from text (e.g., "Monday: 9:00 AM – 10:00 PM")
      const hoursMatch = dayText.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?\s*[–-]\s*(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i);
      if (hoursMatch) {
        // Basic time parsing - this could be enhanced
        return {
          isOpen: true, // Assume open during parsed hours
          reason: `Hours: ${dayText}`,
          confidence: 'medium'
        };
      }
      
      return {
        isOpen: true, // Assume open if hours are listed but not parsed
        reason: `Hours listed: ${dayText}`,
        confidence: 'low'
      };
    }
  }

  // No usable hours data found
  console.log(`⚠️ [Operating Hours] Could not determine hours for ${place.name}`);
  return {
    isOpen: true, // Default to open
    reason: 'Could not determine operating hours',
    confidence: 'unknown'
  };
}

/**
 * Filters venues to only include those that are open at the scheduled time
 */
export function filterOpenVenues(
  venues: PlaceDetails[],
  scheduledDateTime: Date,
  timezone: string = 'America/New_York'
): { openVenues: PlaceDetails[]; closedVenues: PlaceDetails[] } {
  const openVenues: PlaceDetails[] = [];
  const closedVenues: PlaceDetails[] = [];
  
  for (const venue of venues) {
    const validation = validateOperatingHours(venue, scheduledDateTime, timezone);
    
    if (validation.isOpen) {
      openVenues.push(venue);
      console.log(`✅ [Operating Hours] ${venue.name}: ${validation.reason}`);
    } else {
      closedVenues.push(venue);
      console.log(`❌ [Operating Hours] ${venue.name}: ${validation.reason}`);
    }
  }
  
  return { openVenues, closedVenues };
}

/**
 * Suggests alternative times when a venue is open
 */
export function suggestAlternativeTimes(
  place: PlaceDetails,
  preferredDateTime: Date,
  timezone: string = 'America/New_York'
): string[] {
  const suggestions: string[] = [];
  
  if (!place.opening_hours?.periods) {
    return suggestions;
  }
  
  const currentDay = preferredDateTime.getDay();
  const openingHours = place.opening_hours as OpeningHours;
  
  // Look for opening times on the same day
  for (const period of openingHours.periods) {
    if (period.open.day === currentDay && period.open.time) {
      const openTime = formatTime(period.open.time);
      suggestions.push(`Opens at ${openTime} today`);
    }
  }
  
  // Look for next day options
  const nextDay = (currentDay + 1) % 7;
  for (const period of openingHours.periods) {
    if (period.open.day === nextDay && period.open.time) {
      const openTime = formatTime(period.open.time);
      suggestions.push(`Opens at ${openTime} tomorrow`);
    }
  }
  
  return suggestions.slice(0, 2); // Return up to 2 suggestions
}

/**
 * Helper function to format time from HHMM to readable format
 */
function formatTime(time: string): string {
  if (time.length === 4) {
    const hours = parseInt(time.substring(0, 2));
    const minutes = time.substring(2, 4);
    
    if (hours === 0) {
      return `12:${minutes} AM`;
    } else if (hours < 12) {
      return `${hours}:${minutes} AM`;
    } else if (hours === 12) {
      return `12:${minutes} PM`;
    } else {
      return `${hours - 12}:${minutes} PM`;
    }
  }
  return time; // Return as-is if format is unexpected
}

/**
 * Helper function to get day name from day number
 */
function getDayName(day: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[day] || 'Unknown';
}