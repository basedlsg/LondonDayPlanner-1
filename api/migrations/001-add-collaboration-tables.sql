-- Migration: Add collaboration tables
-- Created: $(date)
-- Purpose: Add tables for collaborative itinerary planning feature

-- Create collaborations table
CREATE TABLE IF NOT EXISTS collaborations (
    id SERIAL PRIMARY KEY,
    itinerary_id INTEGER NOT NULL REFERENCES itineraries(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES users(id),
    share_token VARCHAR(64) NOT NULL UNIQUE,
    title TEXT NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    allow_editing BOOLEAN DEFAULT TRUE,
    allow_comments BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP,
    created TIMESTAMP NOT NULL DEFAULT NOW(),
    updated TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create collaborators table
CREATE TABLE IF NOT EXISTS collaborators (
    id SERIAL PRIMARY KEY,
    collaboration_id INTEGER NOT NULL REFERENCES collaborations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    email VARCHAR(255),
    role VARCHAR(20) NOT NULL DEFAULT 'viewer',
    joined_at TIMESTAMP DEFAULT NOW(),
    invited_at TIMESTAMP NOT NULL DEFAULT NOW(),
    invited_by UUID NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    CONSTRAINT collaborators_user_or_email CHECK (user_id IS NOT NULL OR email IS NOT NULL)
);

-- Create itinerary_comments table
CREATE TABLE IF NOT EXISTS itinerary_comments (
    id SERIAL PRIMARY KEY,
    itinerary_id INTEGER NOT NULL REFERENCES itineraries(id) ON DELETE CASCADE,
    collaboration_id INTEGER REFERENCES collaborations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    author_name VARCHAR(255),
    content TEXT NOT NULL,
    reply_to INTEGER REFERENCES itinerary_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT comments_user_or_name CHECK (user_id IS NOT NULL OR author_name IS NOT NULL)
);

-- Create venue_votes table
CREATE TABLE IF NOT EXISTS venue_votes (
    id SERIAL PRIMARY KEY,
    collaboration_id INTEGER NOT NULL REFERENCES collaborations(id) ON DELETE CASCADE,
    itinerary_place_id INTEGER NOT NULL REFERENCES itinerary_places(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    voter_name VARCHAR(255),
    vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('like', 'dislike')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT venue_votes_user_or_name CHECK (user_id IS NOT NULL OR voter_name IS NOT NULL),
    CONSTRAINT unique_user_vote UNIQUE (collaboration_id, itinerary_place_id, user_id),
    CONSTRAINT unique_name_vote UNIQUE (collaboration_id, itinerary_place_id, voter_name)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_collaborations_itinerary_id ON collaborations(itinerary_id);
CREATE INDEX IF NOT EXISTS idx_collaborations_share_token ON collaborations(share_token);
CREATE INDEX IF NOT EXISTS idx_collaborations_owner_id ON collaborations(owner_id);

CREATE INDEX IF NOT EXISTS idx_collaborators_collaboration_id ON collaborators(collaboration_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_user_id ON collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_email ON collaborators(email);

CREATE INDEX IF NOT EXISTS idx_itinerary_comments_itinerary_id ON itinerary_comments(itinerary_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_comments_collaboration_id ON itinerary_comments(collaboration_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_comments_user_id ON itinerary_comments(user_id);

CREATE INDEX IF NOT EXISTS idx_venue_votes_collaboration_id ON venue_votes(collaboration_id);
CREATE INDEX IF NOT EXISTS idx_venue_votes_itinerary_place_id ON venue_votes(itinerary_place_id);
CREATE INDEX IF NOT EXISTS idx_venue_votes_user_id ON venue_votes(user_id);