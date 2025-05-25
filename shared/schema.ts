import { pgTable, text, serial, timestamp, jsonb, uuid, varchar, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User authentication tables
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password_hash: text("password_hash"),  // Optional for OAuth users
  name: text("name"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  avatar_url: text("avatar_url"),
  google_id: text("google_id").unique(),
  auth_provider: text("auth_provider").default("local"),  // "local" or "google"
});

// Session table with structure compatible with connect-pg-simple
export const sessions = pgTable("sessions", {
  sid: varchar("sid", { length: 255 }).notNull().primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

export const places = pgTable("places", {
  id: serial("id").primaryKey(),
  placeId: text("place_id").notNull().unique(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  location: jsonb("location").notNull(),
  details: jsonb("details").notNull(),
  alternatives: jsonb("alternatives"),  // Store alternative venues
  scheduledTime: text("scheduled_time"),
});

export const itineraries = pgTable("itineraries", {
  id: serial("id").primaryKey(),
  title: text("title"),
  description: text("description"),
  planDate: timestamp("plan_date"),
  query: text("query").notNull(),
  places: jsonb("places").notNull(),
  travelTimes: jsonb("travel_times").notNull(),
  created: timestamp("created").notNull().defaultNow(),
});

// Update itineraries schema to include user association
export const userItineraries = pgTable("user_itineraries", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  itineraryId: serial("itinerary_id").notNull().references(() => itineraries.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPlaceSchema = createInsertSchema(places).omit({ id: true });
export const insertItinerarySchema = createInsertSchema(itineraries, {
  title: z.string().optional(),
  description: z.string().optional(),
  planDate: z.string().datetime().optional(),
  places: z.array(z.any()),
  travelTimes: z.array(z.any()),
}).omit({ id: true, created: true });
// Schema for local registration
export const insertLocalUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  created_at: true, 
  password_hash: true,
  google_id: true,
  avatar_url: true,
  auth_provider: true
})
  .extend({
    password: z.string().min(8).max(100),
    confirmPassword: z.string().min(8).max(100)
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
  });

// Schema for Google sign-in
export const insertGoogleUserSchema = createInsertSchema(users).omit({
  id: true,
  created_at: true,
  password_hash: true,
  auth_provider: true
}).extend({
  auth_provider: z.literal("google")
});

// Schema for login
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

// Schema for Google auth
export const googleAuthSchema = z.object({
  token: z.string()
});

export type Place = typeof places.$inferSelect;
export type InsertPlace = z.infer<typeof insertPlaceSchema>;
export type Itinerary = typeof itineraries.$inferSelect;
export type InsertItinerary = z.infer<typeof insertItinerarySchema>;
export type User = typeof users.$inferSelect;
export type InsertLocalUser = z.infer<typeof insertLocalUserSchema>;
export type InsertGoogleUser = z.infer<typeof insertGoogleUserSchema>;
export type UserItinerary = typeof userItineraries.$inferSelect;
export type LoginCredentials = z.infer<typeof loginSchema>;
export type GoogleAuthCredentials = z.infer<typeof googleAuthSchema>;

export type PlaceDetails = {
  name: string;
  formatted_address: string;
  place_id: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types?: string[];
  rating?: number;
  opening_hours?: {
    open_now?: boolean;
    periods?: Array<{
      open: { time: string; day: number };
      close: { time: string; day: number };
    }>;
  };
  is_primary?: boolean;
  distance_from_primary?: number;
  area_info?: any;
  // Additional fields for enhanced context
  activityDescription?: string;
  requirements?: string[];
  searchTermUsed?: string;
  // Weather-related information
  isOutdoorVenue?: boolean;
  weatherSuitable?: boolean;
  weatherAwareRecommendation?: boolean;
};

export type VenueSearchResult = {
  primary: PlaceDetails;
  alternatives: PlaceDetails[];
};

export type SearchParameters = {
  searchTerm: string;
  type: string;
  keywords: string[];
  minRating: number;
  requireOpenNow: boolean;
};

export type Activity = {
  description: string;
  location: string;
  time: string;
  searchParameters: SearchParameters;
  requirements: string[];
};

export type EnhancedRequest = {
  startLocation: string | null;
  destinations: string[];
  activities: Activity[];
  preferences: {
    venueQualities: string[];
    restrictions: string[];
  };
};