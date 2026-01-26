# Plan Your Perfect Day - iOS Native App

A native iOS app built with SwiftUI for iOS 26, featuring the Liquid Glass design system.

## Requirements

- Xcode 26+
- iOS 26.0+
- Swift 6.0+

## Project Structure

```
ios-native/
├── Package.swift              # Swift Package Manager config
├── Sources/
│   ├── App/
│   │   ├── PlanYourPerfectDayApp.swift  # App entry point
│   │   └── ContentView.swift            # Main tab navigation
│   ├── DesignSystem/
│   │   ├── DesignTokens.swift           # Colors, spacing, typography
│   │   └── Components/
│   │       ├── GlassCard.swift          # Glass container
│   │       ├── GlassButton.swift        # Glass button
│   │       ├── GlassTextField.swift     # Glass text input
│   │       └── LiquidBackground.swift   # Animated background
│   ├── Models/
│   │   └── Models.swift                 # Data models (City, Place, Itinerary, etc.)
│   ├── Services/
│   │   ├── APIClient.swift              # Network client
│   │   ├── CityManager.swift            # City selection state
│   │   └── NetworkMonitor.swift         # Connectivity monitor
│   └── Views/
│       ├── HomeView.swift               # Main planning screen
│       ├── ItineraryView.swift          # Itinerary display
│       ├── TripsView.swift              # Saved trips
│       ├── ExploreView.swift            # City exploration
│       ├── SettingsView.swift           # App settings
│       └── MapView.swift                # MapKit integration
└── Tests/
    └── APIClientTests.swift             # Unit tests
```

## Features

- **Liquid Glass UI**: iOS 26-style glassmorphism with animated backgrounds
- **Multi-City Support**: NYC, London, Boston, Austin (expandable)
- **AI-Powered Planning**: Natural language itinerary generation
- **Interactive Map**: MapKit with custom annotations
- **Share & Export**: PDF, Calendar, and share sheet integration

## Building

```bash
# Open in Xcode
open Package.swift

# Or build from command line
swift build
```

## Testing

```bash
swift test
```

## Design System

The app uses a custom Liquid Glass design system with:

- **Colors**: Pink (#FFC0CB) and Blue (#ADD8E6) accents
- **Glass Variants**: Light, Frosted, Heavy
- **Animations**: Spring-based with staggered reveals
- **Backdrop Blur**: Native Material system
