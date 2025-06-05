CREATE TABLE "collaborations" (
	"id" serial PRIMARY KEY NOT NULL,
	"itinerary_id" serial NOT NULL,
	"owner_id" uuid NOT NULL,
	"share_token" varchar(64) NOT NULL,
	"title" text NOT NULL,
	"is_public" boolean DEFAULT false,
	"allow_editing" boolean DEFAULT true,
	"allow_comments" boolean DEFAULT true,
	"expires_at" timestamp,
	"created" timestamp DEFAULT now() NOT NULL,
	"updated" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "collaborations_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
CREATE TABLE "collaborators" (
	"id" serial PRIMARY KEY NOT NULL,
	"collaboration_id" serial NOT NULL,
	"user_id" uuid,
	"email" varchar(255),
	"role" varchar(20) DEFAULT 'collaborator' NOT NULL,
	"joined_at" timestamp DEFAULT now(),
	"last_active" timestamp DEFAULT now(),
	"created" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "itineraries" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text,
	"description" text,
	"plan_date" timestamp,
	"query" text NOT NULL,
	"places" jsonb NOT NULL,
	"travel_times" jsonb NOT NULL,
	"created" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "itinerary_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"itinerary_id" serial NOT NULL,
	"collaboration_id" serial NOT NULL,
	"user_id" uuid,
	"author_name" varchar(100),
	"place_id" varchar(255),
	"content" text NOT NULL,
	"type" varchar(20) DEFAULT 'comment',
	"parent_id" serial NOT NULL,
	"votes" jsonb DEFAULT '{}'::jsonb,
	"created" timestamp DEFAULT now() NOT NULL,
	"updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "places" (
	"id" serial PRIMARY KEY NOT NULL,
	"place_id" text NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"location" jsonb NOT NULL,
	"details" jsonb NOT NULL,
	"alternatives" jsonb,
	"scheduled_time" text,
	CONSTRAINT "places_place_id_unique" UNIQUE("place_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar(255) PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_days" (
	"id" serial PRIMARY KEY NOT NULL,
	"trip_id" serial NOT NULL,
	"day_number" serial NOT NULL,
	"date" timestamp NOT NULL,
	"title" text,
	"theme" text,
	"places" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"travel_times" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text,
	"start_location" jsonb,
	"end_location" jsonb
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"city" varchar(50) NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"total_days" serial NOT NULL,
	"accommodations" jsonb DEFAULT '[]'::jsonb,
	"created" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_itineraries" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"itinerary_id" serial NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"default_city" varchar(50),
	"favorite_locations" jsonb DEFAULT '[]'::jsonb,
	"activity_preferences" jsonb DEFAULT '{}'::jsonb,
	"budget_preference" varchar(20) DEFAULT 'moderate',
	"weather_aware" boolean DEFAULT true,
	"prefer_indoor" boolean DEFAULT false,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text,
	"name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"avatar_url" text,
	"google_id" text,
	"auth_provider" text DEFAULT 'local',
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_google_id_unique" UNIQUE("google_id")
);
--> statement-breakpoint
CREATE TABLE "venue_votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"collaboration_id" serial NOT NULL,
	"itinerary_id" serial NOT NULL,
	"place_id" varchar(255) NOT NULL,
	"user_id" uuid,
	"vote" varchar(10) NOT NULL,
	"created" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "collaborations" ADD CONSTRAINT "collaborations_itinerary_id_itineraries_id_fk" FOREIGN KEY ("itinerary_id") REFERENCES "public"."itineraries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collaborations" ADD CONSTRAINT "collaborations_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collaborators" ADD CONSTRAINT "collaborators_collaboration_id_collaborations_id_fk" FOREIGN KEY ("collaboration_id") REFERENCES "public"."collaborations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collaborators" ADD CONSTRAINT "collaborators_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_comments" ADD CONSTRAINT "itinerary_comments_itinerary_id_itineraries_id_fk" FOREIGN KEY ("itinerary_id") REFERENCES "public"."itineraries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_comments" ADD CONSTRAINT "itinerary_comments_collaboration_id_collaborations_id_fk" FOREIGN KEY ("collaboration_id") REFERENCES "public"."collaborations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_comments" ADD CONSTRAINT "itinerary_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_comments" ADD CONSTRAINT "itinerary_comments_parent_id_itinerary_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."itinerary_comments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_days" ADD CONSTRAINT "trip_days_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_itineraries" ADD CONSTRAINT "user_itineraries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_itineraries" ADD CONSTRAINT "user_itineraries_itinerary_id_itineraries_id_fk" FOREIGN KEY ("itinerary_id") REFERENCES "public"."itineraries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_votes" ADD CONSTRAINT "venue_votes_collaboration_id_collaborations_id_fk" FOREIGN KEY ("collaboration_id") REFERENCES "public"."collaborations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_votes" ADD CONSTRAINT "venue_votes_itinerary_id_itineraries_id_fk" FOREIGN KEY ("itinerary_id") REFERENCES "public"."itineraries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_votes" ADD CONSTRAINT "venue_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;