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

// User preferences table
export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id).unique(),
  defaultCity: varchar("default_city", { length: 50 }),
  favoriteLocations: jsonb("favorite_locations").default([]),
  activityPreferences: jsonb("activity_preferences").default({}),
  budgetPreference: varchar("budget_preference", { length: 20 }).default("moderate"), // budget, moderate, premium
  weatherAware: boolean("weather_aware").default(true),
  preferIndoor: boolean("prefer_indoor").default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Multi-day trip table
export const trips = pgTable("trips", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  city: varchar("city", { length: 50 }).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  totalDays: serial("total_days").notNull(),
  accommodations: jsonb("accommodations").default([]), // Array of hotel/accommodation info
  created: timestamp("created").notNull().defaultNow(),
});

// Individual days within a trip
export const tripDays = pgTable("trip_days", {
  id: serial("id").primaryKey(),
  tripId: serial("trip_id").notNull().references(() => trips.id),
  dayNumber: serial("day_number").notNull(),
  date: timestamp("date").notNull(),
  title: text("title"),
  theme: text("theme"), // e.g., "Museums & Culture", "Shopping & Food"
  places: jsonb("places").notNull().default([]),
  travelTimes: jsonb("travel_times").notNull().default([]),
  notes: text("notes"),
  startLocation: jsonb("start_location"), // Where the day starts (hotel, etc.)
  endLocation: jsonb("end_location"), // Where the day ends
});

// Collaboration tables
export const collaborations = pgTable("collaborations", {
  id: serial("id").primaryKey(),
  itineraryId: serial("itinerary_id").notNull().references(() => itineraries.id, { onDelete: "cascade" }),
  ownerId: uuid("owner_id").notNull().references(() => users.id),
  shareToken: varchar("share_token", { length: 64 }).notNull().unique(), // For shareable links
  title: text("title").notNull(), // Custom title for sharing
  isPublic: boolean("is_public").default(false), // Public link vs private invite
  allowEditing: boolean("allow_editing").default(true), // Can collaborators edit?
  allowComments: boolean("allow_comments").default(true), // Can collaborators comment?
  expiresAt: timestamp("expires_at"), // Optional expiration
  created: timestamp("created").notNull().defaultNow(),
  updated: timestamp("updated").notNull().defaultNow(),
});

export const collaborators = pgTable("collaborators", {
  id: serial("id").primaryKey(),
  collaborationId: serial("collaboration_id").notNull().references(() => collaborations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id), // Null for anonymous collaborators
  email: varchar("email", { length: 255 }), // For email invites
  role: varchar("role", { length: 20 }).notNull().default("collaborator"), // owner, editor, viewer, collaborator
  joinedAt: timestamp("joined_at").defaultNow(),
  lastActive: timestamp("last_active").defaultNow(),
  created: timestamp("created").notNull().defaultNow(),
});

export const itineraryComments = pgTable("itinerary_comments", {
  id: serial("id").primaryKey(),
  itineraryId: serial("itinerary_id").notNull().references(() => itineraries.id, { onDelete: "cascade" }),
  collaborationId: serial("collaboration_id").references(() => collaborations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id), // Null for anonymous comments
  authorName: varchar("author_name", { length: 100 }), // For anonymous users
  placeId: varchar("place_id", { length: 255 }), // Null for general comments
  content: text("content").notNull(),
  type: varchar("type", { length: 20 }).default("comment"), // comment, suggestion, vote
  parentId: serial("parent_id").references(() => itineraryComments.id), // For replies
  votes: jsonb("votes").default({}), // { up: 5, down: 2 }
  created: timestamp("created").notNull().defaultNow(),
  updated: timestamp("updated").notNull().defaultNow(),
});

export const venueVotes = pgTable("venue_votes", {
  id: serial("id").primaryKey(),
  collaborationId: serial("collaboration_id").notNull().references(() => collaborations.id, { onDelete: "cascade" }),
  itineraryId: serial("itinerary_id").notNull().references(() => itineraries.id, { onDelete: "cascade" }),
  placeId: varchar("place_id", { length: 255 }).notNull(), // Google Place ID
  userId: uuid("user_id").references(() => users.id),
  vote: varchar("vote", { length: 10 }).notNull(), // thumbs_up, thumbs_down, heart, star
  created: timestamp("created").notNull().defaultNow(),
});

// Indexes for collaboration features
export const collaborationIndexes = [
  // Add indexes for better performance
];

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
export type UserItinerary = typeof userItineraries.$inferSelect;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type Trip = typeof trips.$inferSelect;
export type InsertTrip = typeof trips.$inferInsert;
export type TripDay = typeof tripDays.$inferSelect;
export type InsertTripDay = typeof tripDays.$inferInsert;
export type Collaboration = typeof collaborations.$inferSelect;
export type InsertCollaboration = typeof collaborations.$inferInsert;
export type Collaborator = typeof collaborators.$inferSelect;
export type InsertCollaborator = typeof collaborators.$inferInsert;
export type ItineraryComment = typeof itineraryComments.$inferSelect;
export type InsertItineraryComment = typeof itineraryComments.$inferInsert;
export type VenueVote = typeof venueVotes.$inferSelect;
export type InsertVenueVote = typeof venueVotes.$inferInsert;
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