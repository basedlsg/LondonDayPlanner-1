/**
 * Smart Query Analysis - Determines single venue vs timeline display
 * Parses user intent to provide appropriate response format
 */

interface ActivityMatch {
  activity: string;
  time?: string;
  location?: string;
}

interface QueryAnalysis {
  isMultiActivity: boolean;
  activities: ActivityMatch[];
  primaryQuery: string;
  suggestedCount: number;
}

/**
 * Analyzes query to determine if user wants single venue or timeline
 */
export function analyzeQuery(query: string): QueryAnalysis {
  const lowercaseQuery = query.toLowerCase().trim();
  
  // Strong multi-activity indicators (definitive separators)
  const strongMultiIndicators = [
    // Conjunctions
    ' and ', ' then ', ' after ', ' followed by ', ' plus ',
    // Separators  
    ',', ';', '|'
  ];
  
  // Time pattern detection - more precise
  const timePatterns = [
    /\b\d{1,2}:\d{2}\s?(am|pm)\b/gi,  // 9:30 AM, 2:00 PM
    /\b\d{1,2}\s?(am|pm)\b/gi,        // 9 AM, 2 PM
  ];
  
  // Count actual time references (not including single "at" patterns)
  const timeMatches = timePatterns.reduce((count, pattern) => {
    const matches = query.match(pattern);
    return count + (matches ? matches.length : 0);
  }, 0);
  
  // Check for strong multiple activity indicators
  const hasStrongMultiIndicators = strongMultiIndicators.some(indicator => 
    lowercaseQuery.includes(indicator)
  );
  
  // Check for multiple distinct activities (breakfast, lunch, dinner, etc.)
  const mealTimes = ['breakfast', 'brunch', 'lunch', 'dinner'];
  const mealCount = mealTimes.filter(meal => lowercaseQuery.includes(meal)).length;
  
  // Determine if multi-activity - be more conservative
  const isMultiActivity = hasStrongMultiIndicators || timeMatches > 1 || mealCount > 1;
  
  if (isMultiActivity) {
    // Parse complex query into activities
    const activities = parseMultiActivityQuery(query);
    return {
      isMultiActivity: true,
      activities,
      primaryQuery: query,
      suggestedCount: Math.max(activities.length, 2)
    };
  } else {
    // Single activity query
    return {
      isMultiActivity: false,
      activities: [{ activity: query }],
      primaryQuery: query,
      suggestedCount: 1
    };
  }
}

/**
 * Parses complex queries into individual activities with times
 */
function parseMultiActivityQuery(query: string): ActivityMatch[] {
  const activities: ActivityMatch[] = [];
  
  // Split by common separators - more comprehensive
  const segments = query.split(/\s*(?:,\s*(?:and\s+)?|;\s*|\s+and\s+|\s+then\s+|\s+after\s+|\s+followed\s+by\s+|\s+plus\s+|\|)\s*/i);
  
  console.log('🔄 Splitting query into segments:', segments);
  
  for (const segment of segments) {
    const trimmed = segment.trim();
    if (trimmed.length === 0) continue;
    
    // Extract time from segment - handle both explicit AM/PM and bare numbers
    let time = undefined;
    
    // First try to match explicit AM/PM times
    const explicitTimeMatch = trimmed.match(/\b(?:at\s?)?(\d{1,2}(?::\d{2})?\s?(?:am|pm))\b/i);
    if (explicitTimeMatch) {
      time = explicitTimeMatch[1];
    } else {
      // Try to match bare numbers like "at 12", "at 5", "at 8"
      const bareNumberMatch = trimmed.match(/\bat\s?(\d{1,2})(?!\d)/i);
      if (bareNumberMatch) {
        const hour = parseInt(bareNumberMatch[1]);
        
        // Intelligent AM/PM assignment
        if (hour >= 6 && hour <= 11) {
          // 6-11: Check context for evening activities
          const isEveningActivity = /\b(dinner|drinks|bar|club|night)\b/i.test(trimmed);
          time = isEveningActivity ? `${hour}:00 PM` : `${hour}:00 AM`;
        } else if (hour === 12) {
          time = `${hour}:00 PM`; // 12 is usually noon
        } else if (hour >= 1 && hour <= 5) {
          time = `${hour}:00 PM`; // 1-5 usually afternoon/evening
        } else if (hour >= 6 && hour <= 11) {
          time = `${hour}:00 PM`; // Evening hours
        }
      }
    }
    
    // Extract location
    const locationMatch = trimmed.match(/\bin\s+([^,]+)/i);
    const location = locationMatch ? locationMatch[1].trim() : undefined;
    
    // Clean activity text (remove time and location for cleaner search)
    let activity = trimmed
      .replace(/\b(?:at\s?)?\d{1,2}(?::\d{2})?\s?(?:am|pm)\b/gi, '')
      .replace(/\bin\s+[^,]+/gi, '')
      .trim();
    
    // Add location back for context if no other location info
    if (location && !activity.includes(location)) {
      activity += ` in ${location}`;
    }
    
    console.log(`📝 Parsed segment: "${trimmed}" → activity: "${activity}", time: ${time}`);
    
    activities.push({
      activity: activity || trimmed,
      time,
      location
    });
  }
  
  // If no activities found, treat as single activity
  if (activities.length === 0) {
    activities.push({ activity: query });
  }
  
  console.log(`📋 Total activities parsed: ${activities.length}`);
  return activities;
}

/**
 * Generates time schedule for activities
 */
export function generateTimeSchedule(activities: ActivityMatch[], startTime: string = '12:00 PM'): ActivityMatch[] {
  const scheduledActivities = [...activities];
  let currentTime = parseTime(startTime);
  
  for (let i = 0; i < scheduledActivities.length; i++) {
    const activity = scheduledActivities[i];
    
    if (!activity.time) {
      // Assign time based on current position
      activity.time = formatTime(currentTime);
      
      // Increment time for next activity (2-3 hours spacing)
      currentTime += (i === 0) ? 2 : 2.5;
      
      // Keep within reasonable day hours (8 AM - 10 PM)
      if (currentTime > 22) currentTime = 22;
    } else {
      // Use specified time and update current time
      currentTime = parseTime(activity.time);
    }
  }
  
  return scheduledActivities;
}

/**
 * Parse time string to 24-hour format
 */
function parseTime(timeStr: string): number {
  const match = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s?(am|pm)?/i);
  if (!match) return 12;
  
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2] || '0');
  const period = match[3]?.toLowerCase();
  
  if (period === 'pm' && hours !== 12) hours += 12;
  if (period === 'am' && hours === 12) hours = 0;
  
  return hours + (minutes / 60);
}

/**
 * Format time from 24-hour to display format
 */
function formatTime(time: number): string {
  const hours = Math.floor(time);
  const minutes = Math.round((time % 1) * 60);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
  
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Examples of query analysis:
 * 
 * "Coffee in Soho" 
 * → Single activity, 1 venue
 * 
 * "Coffee at 9am, lunch in Chinatown at 1pm, Central Park at 3pm"
 * → Multi-activity, timeline with 3 scheduled stops
 * 
 * "Breakfast and then museum"
 * → Multi-activity, timeline with 2 stops (times auto-assigned)
 */