# Multi-City Day Planner

An intelligent day planner that generates personalized, time-optimized itineraries for exploring major cities worldwide using advanced AI natural language processing and comprehensive location APIs. Currently supporting New York City, London, Boston, and Austin with expansion to additional cities planned.

## Features

- **Multi-City Support**: Plan itineraries across NYC, London, Boston, and Austin with city-specific recommendations and local timezone handling
- **Advanced AI Processing**: Powered by Google Gemini AI for sophisticated natural language understanding and itinerary generation
- **Natural Language Input**: Describe complex plans in plain English (e.g., "Coffee in Greenwich Village at 10am, then visit MoMA around noon, followed by lunch in Midtown at 2pm")
- **Smart Scheduling**: Automatically fills your day with interesting activities based on location, time, and preferences
- **Time-Aware Planning**: 
  - Supports both 12-hour and 24-hour time formats
  - Handles multi-city timezone differences automatically
  - Considers typical activity durations and travel times
  - Automatically schedules meals during appropriate hours
- **Contextual Recommendations**:
  - City-specific venue suggestions based on local culture and preferences
  - Weather-aware planning for indoor/outdoor activities
  - Area-intelligent suggestions (business districts, tourist areas, residential neighborhoods)
  - Alternative venue options for flexibility
- **Enterprise Features**:
  - Real-time collaboration and sharing
  - Calendar integration (ICS export, Google Calendar)
  - PDF export for offline use
  - Mobile app support (iOS/Android via Capacitor)

## How It Works

1. **Input Your Plans**:
   - Select your preferred date
   - Choose a start time
   - Describe your plans in the text area

2. **Get Your Itinerary**:
   - The app analyzes your input to identify:
     - Starting location
     - Fixed appointments (e.g., dinner reservations)
     - Specific preferences (e.g., "quiet coffee shop")
   - Generates a sequential itinerary with:
     - Verified locations from Google Places
     - Estimated travel times
     - Suggested activities for free time periods

3. **Export Options**:
   - Export to calendar (ICS format)
   - View travel times between locations

## Technical Architecture

### Frontend
- React with TypeScript
- Real-time form validation
- Dynamic itinerary display
- Responsive design for all devices

### Backend
- Express.js server with TypeScript
- Google Gemini AI integration for natural language processing
- Multi-provider AI support (OpenAI, Anthropic Claude)
- Google Places API integration with enhanced search
- PostgreSQL database with Drizzle ORM
- Rate limiting and error recovery systems
- Multi-city configuration management

### Key Components
- Time verification system
- Location-aware activity suggestions
- Travel time calculations
- Intelligent gap filling for unscheduled periods

## Example Use Cases

### New York City
1. **Work & Dinner Plans**:
   "I'm at Grand Central Station and need a quiet café to work until my dinner at Carbone in Greenwich Village at 8pm"

2. **Tourist Day Out**:
   "Coffee and pastries in Greenwich Village at 10am, then visit MoMA around noon, followed by lunch in Midtown at 2pm"

### London
3. **Business Travel**:
   "I'm in Canary Wharf now, have a call 10 AM - need a quiet place to talk preferably with good coffee. Will work from there until 3 PM, then I have a meeting in Mayfair at 5"

4. **Tourist Experience**:
   "Starting from Camden Market at 11am, want to see some museums and have afternoon tea in Covent Garden"

### Multi-City Features
- **Timezone Handling**: Automatically converts and displays times in local city timezone
- **Cultural Context**: Venue suggestions adapt to local culture (e.g., pub culture in London vs coffee culture in NYC)
- **Transportation Integration**: Accounts for city-specific transport (NYC Subway, London Underground, etc.)

The app creates balanced itineraries with appropriate meal times, interesting activities, and realistic travel times between locations.
