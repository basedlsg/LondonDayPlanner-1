# London Day Planner

![Platforms](https://img.shields.io/badge/Platforms-Web_%7C_iOS_%7C_Android-blue) ![Stack](https://img.shields.io/badge/Stack-PERN_%2B_Capacitor-green)

**London Day Planner** is a comprehensive travel companion application designed to help users curate perfect days in London. It leverages AI to generate personalized itineraries based on user preferences and integrates real-time data for a seamless travel experience.

## 🌍 Key Features

- **AI Itinerary Generation**: Uses Google Gemini to create bespoke daily plans.
- **Cross-Platform Availability**: Accessible as a responsive web app and native mobile apps (iOS & Android).
- **Rich Interactive Maps**: Integrated Google Maps for venue discovery and navigation.
- **User Accounts**: Secure authentication and cloud sync for saving plans across devices.

## 🛠 Technology Stack

### Frontend (Web & Mobile)
- **Framework**: React 18, Vite
- **Mobile Runtime**: Capacitor 7 (Access to native device features)
- **Styling**: TailwindCSS (v3.4), Shadcn/UI
- **State**: React Query, Zustand

### Backend (API)
- **Server**: Node.js, Express
- **Database**: PostgreSQL (via Neon Serverless)
- **ORM**: Drizzle ORM
- **AI**: Google Generative AI SDK

## 🚀 Getting Started

### Prerequisites
- Node.js (v20+)
- Docker (optional, for local DB)
- PostgreSQL database URL

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repo-url>
   cd LondonDayPlanner
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Environment Setup**:
   Create a `.env` file based on `.env.example`:
   ```env
   DATABASE_URL=postgres://...
   GEMINI_API_KEY=...
   ```

4. **Run Development Server**:
   ```bash
   npm run dev:both
   # Runs both client (port 5173) and server (port 3000)
   ```

## 📱 Mobile Build

To build and run on simulators:

```bash
# iOS
npm run build:client
npx cap sync ios
npx cap open ios

# Android
npm run build:client
npx cap sync android
npx cap open android
```

## 📄 License
Proprietary. All rights reserved.
