// Time parsing and formatting utilities

/**
 * Get the current day of week as a string
 */
export function getDayOfWeek(): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date().getDay()];
}

/**
 * Get current time in HH:MM format
 */
export function getCurrentTime(): string {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
}

/**
 * Format time from HH:MM (24h) to h:mm a (12h) format
 */
export function formatTime12h(time24h: string): string {
  const [hours, minutes] = time24h.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Parse time string to minutes since midnight
 */
export function parseTimeToMinutes(time: string): number {
  // Handle HH:MM format
  if (time.includes(':')) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + (minutes || 0);
  }
  // Handle HHMM format
  const hours = parseInt(time.slice(0, 2), 10);
  const minutes = parseInt(time.slice(2, 4), 10) || 0;
  return hours * 60 + minutes;
}

/**
 * Calculate time difference in minutes
 */
export function timeDifferenceMinutes(time1: string, time2: string): number {
  return Math.abs(parseTimeToMinutes(time1) - parseTimeToMinutes(time2));
}

/**
 * Add minutes to a time string and return in HH:MM format
 */
export function addMinutesToTime(time: string, minutes: number): string {
  const totalMinutes = parseTimeToMinutes(time) + minutes;
  const hours = Math.floor(totalMinutes / 60) % 24;
  const mins = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Check if a time is within a time window
 */
export function isTimeInWindow(
  time: string,
  windowStart: string,
  windowEnd: string
): boolean {
  const timeMinutes = parseTimeToMinutes(time);
  const startMinutes = parseTimeToMinutes(windowStart);
  const endMinutes = parseTimeToMinutes(windowEnd);
  return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
}

/**
 * Get a reasonable arrival time within a time window
 */
export function getArrivalTimeInWindow(
  windowStart: string,
  windowEnd: string,
  preferredBuffer: number = 30 // minutes from start
): string {
  const startMinutes = parseTimeToMinutes(windowStart);
  const endMinutes = parseTimeToMinutes(windowEnd);
  const windowDuration = endMinutes - startMinutes;

  // If window is small, return midpoint
  if (windowDuration <= preferredBuffer * 2) {
    const midpoint = startMinutes + Math.floor(windowDuration / 2);
    const hours = Math.floor(midpoint / 60);
    const mins = midpoint % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  // Otherwise, return start + buffer
  return addMinutesToTime(windowStart, preferredBuffer);
}
