// Core types for the itinerary planning system

export type QueryTier = 'simple' | 'detailed' | 'complex';

export interface Classification {
  tier: QueryTier;
  activityCount: number;
  hasTimeConstraints: boolean;
  hasPreferences: boolean;
  model: 'gemini-2.5-flash' | 'gemini-2.5-flash-lite' | 'gemini-2.5-pro';
}

export interface QueryContext {
  currentTime: string;
  dayOfWeek: string;
  date?: string;
  startTime?: string;
  timezone?: string;
}

export interface SearchContext extends QueryContext {
  city: string;
  citySlug: string;
}

export interface CityConfig {
  name: string;
  slug: string;
  country: string;
  timezone: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  neighborhoods: string[];
}

export interface PlanRequest {
  date: string;
  startTime: string;
  query: string;
  weatherAware?: boolean;
  city?: string;
  isPremium?: boolean;
}

// Parsed query structures
export interface ParsedSimpleQuery {
  venueType: string;
  searchQuery: string;
  location: string;
  requirements: string[];
}

export interface ParsedDetailedQuery extends ParsedSimpleQuery {
  idealArrivalTime?: string;
  stayDuration?: string;
  ambience?: string;
}

export interface FixedAppointment {
  time: string;
  activity: string;
  location: string;
  venuePreference?: string;
}

export interface FlexibleActivity {
  timeWindow: {
    earliest: string;
    latest: string;
  };
  activity: string;
  location: string;
  venuePreference?: string;
  requirements?: string[];
}

export interface ParsedComplexQuery {
  fixedAppointments: FixedAppointment[];
  flexibleActivities: FlexibleActivity[];
  preferences?: {
    pace?: 'relaxed' | 'moderate' | 'busy';
    budget?: 'budget' | 'moderate' | 'expensive';
  };
}

export interface ParsedActivity {
  activity: string;
  location: string;
  venuePreference?: string;
  requirements?: string[];
  scheduledTime?: string;
  timeWindow?: {
    earliest: string;
    latest: string;
  };
  isFixed?: boolean;
}

// Venue types
export interface GroundedVenue {
  name: string;
  address: string;
  whyRecommended: string;
  estimatedRating?: number;
  priceLevel?: string;
  likelyOpenNow?: boolean;
}

export interface GroundedResult {
  venues: GroundedVenue[];
  searchInsights?: string;
}

export interface ValidatedVenue extends GroundedVenue {
  placeId?: string;
  rating?: number;
  totalRatings?: number;
  openingHours?: OpeningHours;
  photos?: PlacePhoto[];
  formattedAddress?: string;
  isOpenNow?: boolean;
}

export interface OpeningHours {
  open_now?: boolean;
  periods?: Array<{
    open: { day: number; time: string };
    close?: { day: number; time: string };
  }>;
  weekday_text?: string[];
}

export interface PlacePhoto {
  name: string;
  widthPx?: number;
  heightPx?: number;
}

export interface DiscoveryResult {
  primary?: ValidatedVenue;
  alternatives: ValidatedVenue[];
  searchInsights?: string;
}

// Location coordinate for places
export interface Location {
  lat: number;
  lng: number;
}

// Itinerary output - matches iOS ScheduledPlace structure
export interface ItineraryPlace {
  placeId?: string;
  name: string;
  address: string;
  location: Location;
  time: string;  // iOS expects 'time', not 'scheduledTime'
  duration?: number;  // in minutes
  categories?: string[];
  rating?: number;
  alternatives?: ValidatedVenue[];
  activityDescription?: string;
}

// TravelTime - matches iOS Itinerary.TravelTime structure
export interface TravelTime {
  from: string;
  to: string;
  durationMinutes: number;
  durationText: string;
  mode?: 'walking' | 'transit' | 'driving';
}

// Itinerary - matches iOS Itinerary structure
// Note: iOS maps 'venues' JSON key to 'places' property
export interface Itinerary {
  id: number;
  title: string;
  description?: string | null;
  planDate: string;
  query: string;
  venues: ItineraryPlace[];  // iOS expects 'venues' key in JSON
  travelTimes: TravelTime[];
  created: string;
  weather?: WeatherInfo | null;
  city: string;
  searchInsights?: string[];
}

// Weather info for itinerary
export interface WeatherInfo {
  temperature: number;
  condition: string;
  icon: string;
  description?: string;
}

export interface CreateItineraryResponse {
  itinerary: Itinerary;
  processingTimeMs: number;
}
