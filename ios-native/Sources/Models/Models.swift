import Foundation

// MARK: - City Models

/// Represents a supported city with its configuration
struct City: Codable, Identifiable, Hashable, Sendable {
    let id: String
    let slug: String
    let name: String
    let country: String
    let timezone: String
    let currency: String
    let language: String?
    let majorAreas: [Area]
    let defaultCenter: Coordinate
    
    struct Area: Codable, Hashable, Sendable {
        let name: String
        let aliases: [String]?
        let center: Coordinate?
    }
    
    struct Coordinate: Codable, Hashable, Sendable {
        let lat: Double
        let lng: Double
    }
}

// MARK: - Place Models

/// Represents a venue/place from Google Places
struct Place: Codable, Identifiable, Hashable, Sendable {
    let id: String
    let placeId: String
    let name: String
    let address: String
    let location: Location
    let types: [String]?
    let rating: Double?
    let openingHours: OpeningHours?
    let isPrimary: Bool?
    let distanceFromPrimary: Double?
    let activityDescription: String?
    let requirements: [String]?
    let searchTermUsed: String?
    let isOutdoorVenue: Bool?
    let weatherSuitable: Bool?
    
    struct Location: Codable, Hashable, Sendable {
        let lat: Double
        let lng: Double
    }
    
    struct OpeningHours: Codable, Hashable, Sendable {
        let openNow: Bool?
        let periods: [Period]?
        
        struct Period: Codable, Hashable, Sendable {
            let open: TimePoint
            let close: TimePoint?
            
            struct TimePoint: Codable, Hashable, Sendable {
                let time: String
                let day: Int
            }
        }
    }
}

/// Venue search result with primary and alternatives
struct VenueSearchResult: Codable, Sendable {
    let primary: Place
    let alternatives: [Place]
}

// MARK: - Itinerary Models

/// A complete day itinerary
struct Itinerary: Codable, Identifiable, Sendable {
    let id: Int
    let title: String?
    let description: String?
    let planDate: Date?
    let query: String
    let places: [ScheduledPlace]
    let travelTimes: [TravelTime]?
    let created: Date
    let weather: WeatherInfo?
    let city: String?
    
    enum CodingKeys: String, CodingKey {
        case id, title, description, planDate, query
        case places = "venues" // Map 'venues' from API to 'places'
        case travelTimes, created, weather, city
    }
    
    /// A place with its scheduled time slot
    struct ScheduledPlace: Codable, Identifiable, Hashable, Sendable {
        var id: String { placeId ?? UUID().uuidString }
        let placeId: String?
        let name: String
        let address: String
        let location: Place.Location
        let scheduledTime: String
        let duration: Int?
        let types: [String]?
        let rating: Double?
        let alternatives: [AlternativePlace]?
        let activityDescription: String?

        enum CodingKeys: String, CodingKey {
            case placeId, name, address, location
            case scheduledTime = "time"
            case duration
            case types = "categories"
            case rating, alternatives, activityDescription
        }
    }

    /// A lightweight alternative venue suggestion from the API
    struct AlternativePlace: Codable, Identifiable, Hashable, Sendable {
        var id: String { placeId ?? name }
        let placeId: String?
        let name: String
        let address: String
        let rating: Double?
        let whyRecommended: String?

        private enum CodingKeys: String, CodingKey {
            case placeId, name, address, formattedAddress, rating, whyRecommended
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            placeId = try c.decodeIfPresent(String.self, forKey: .placeId)
            name = try c.decode(String.self, forKey: .name)
            address = (try? c.decode(String.self, forKey: .address))
                ?? (try? c.decode(String.self, forKey: .formattedAddress))
                ?? ""
            rating = try c.decodeIfPresent(Double.self, forKey: .rating)
            whyRecommended = try c.decodeIfPresent(String.self, forKey: .whyRecommended)
        }

        func encode(to encoder: Encoder) throws {
            var c = encoder.container(keyedBy: CodingKeys.self)
            try c.encodeIfPresent(placeId, forKey: .placeId)
            try c.encode(name, forKey: .name)
            try c.encode(address, forKey: .address)
            try c.encodeIfPresent(rating, forKey: .rating)
            try c.encodeIfPresent(whyRecommended, forKey: .whyRecommended)
        }
    }
    
    /// Travel time between two places
    struct TravelTime: Codable, Hashable, Sendable {
        let from: String
        let to: String
        let durationMinutes: Int
        let durationText: String
        let mode: TransportMode?
        
        enum TransportMode: String, Codable, Sendable {
            case walking, transit, driving
        }
    }
    
    /// Weather information for the day
    struct WeatherInfo: Codable, Sendable {
        let temperature: Double
        let condition: String
        let icon: String
        let description: String?
    }
}

// MARK: - Activity Models

/// Parsed activity from NLP
struct Activity: Codable, Sendable {
    let description: String
    let location: String?
    let time: String?
    let searchParameters: SearchParameters?
    let requirements: [String]?
    
    struct SearchParameters: Codable, Sendable {
        let searchTerm: String
        let type: String?
        let keywords: [String]?
        let minRating: Double?
        let requireOpenNow: Bool?
    }
}

// MARK: - Trip Models

/// Multi-day trip container
struct Trip: Codable, Identifiable, Sendable {
    let id: Int
    let userId: String?
    let title: String
    let description: String?
    let city: String
    let startDate: Date
    let endDate: Date
    let totalDays: Int
    let accommodations: [Accommodation]?
    let created: Date
    
    struct Accommodation: Codable, Sendable {
        let name: String
        let address: String
        let checkIn: Date?
        let checkOut: Date?
    }
}

/// Single day within a trip
struct TripDay: Codable, Identifiable, Sendable {
    let id: Int
    let tripId: Int
    let dayNumber: Int
    let date: Date
    let title: String?
    let theme: String?
    let places: [Itinerary.ScheduledPlace]
    let travelTimes: [Itinerary.TravelTime]
    let notes: String?
    let startLocation: Place.Location?
    let endLocation: Place.Location?
}

// MARK: - User Models

/// User profile
struct User: Codable, Identifiable, Sendable {
    let id: String
    let email: String
    let name: String?
    let avatarUrl: String?
    let authProvider: String?
    let createdAt: Date?
}

/// User preferences
struct UserPreferences: Codable, Sendable {
    var defaultCity: String?
    var favoriteLocations: [String]?
    // activityPreferences removed for Sendability simplicity if not used, 
    // or we'd need a Sendable dictionary. Let's keep it but mark it carefully.
    // var activityPreferences: [String: Any]? 
    var budgetPreference: BudgetPreference?
    var weatherAware: Bool?
    var preferIndoor: Bool?
    
    enum BudgetPreference: String, Codable, Sendable {
        case budget, moderate, premium
    }
    
    enum CodingKeys: String, CodingKey {
        case defaultCity, favoriteLocations, budgetPreference, weatherAware, preferIndoor
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        defaultCity = try container.decodeIfPresent(String.self, forKey: .defaultCity)
        favoriteLocations = try container.decodeIfPresent([String].self, forKey: .favoriteLocations)
        budgetPreference = try container.decodeIfPresent(BudgetPreference.self, forKey: .budgetPreference)
        weatherAware = try container.decodeIfPresent(Bool.self, forKey: .weatherAware)
        preferIndoor = try container.decodeIfPresent(Bool.self, forKey: .preferIndoor)
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encodeIfPresent(defaultCity, forKey: .defaultCity)
        try container.encodeIfPresent(favoriteLocations, forKey: .favoriteLocations)
        try container.encodeIfPresent(budgetPreference, forKey: .budgetPreference)
        try container.encodeIfPresent(weatherAware, forKey: .weatherAware)
        try container.encodeIfPresent(preferIndoor, forKey: .preferIndoor)
    }
}

// MARK: - API Response Models

/// Standard API response wrapper
struct APIResponse<T: Codable & Sendable>: Codable, Sendable {
    let success: Bool?
    let data: T?
    let error: APIError?
    
    struct APIError: Codable, Sendable {
        let message: String
        let code: String?
    }
}

/// Itinerary creation request
struct CreateItineraryRequest: Codable, Sendable {
    let query: String
    let date: String
    let startTime: String?
    let preferences: [String: String]?
    let isPremium: Bool?
}

/// Itinerary creation response
struct CreateItineraryResponse: Codable, Sendable {
    let itinerary: Itinerary
    let processingTimeMs: Int?
}
