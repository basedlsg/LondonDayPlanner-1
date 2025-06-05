# Google OAuth Setup Guide

## Current Status
The app is **fully functional WITHOUT authentication**. Users can:
- Create itineraries
- View itineraries
- Switch between cities
- Use all features

Authentication only adds:
- Ability to save itineraries to your account
- View your itinerary history
- Save preferences (future feature)

## To Enable Google OAuth

### 1. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Google+ API" or "Google Identity"

### 2. Create OAuth 2.0 Credentials
1. Go to APIs & Services > Credentials
2. Click "Create Credentials" > "OAuth client ID"
3. Application type: "Web application"
4. Add authorized JavaScript origins:
   - `http://localhost:3000` (development)
   - `https://yourdomain.com` (production)
5. Add authorized redirect URIs:
   - `http://localhost:3000/auth/google/callback`
   - `https://yourdomain.com/auth/google/callback`

### 3. Get Your Client ID
Copy the Client ID (looks like: `123456789-abcdefg.apps.googleusercontent.com`)

### 4. Add to Environment
Add to your `.env` file:
```
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
```

### 5. Current Implementation
The app already has:
- ✅ Google OAuth backend routes (`/api/auth/google`)
- ✅ Google Sign-In button components
- ✅ Token verification logic
- ✅ User creation for Google accounts

## Email/Password Auth
Currently working and available as an alternative to Google OAuth:
- Register at `/register`
- Login at `/login`
- No external setup required

## Important Notes
- The app works perfectly WITHOUT any authentication
- Google OAuth is OPTIONAL for saving features
- Email/password auth is already working if you don't want to set up Google OAuth