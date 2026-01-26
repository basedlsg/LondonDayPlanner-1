import Foundation
import Alamofire

/// Central API client for backend communication
actor APIClient {
    static let shared = APIClient()
    
    private let baseURL: URL
    private let session: Session
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder
    
    private init() {
        // Configure base URL based on environment
        #if DEBUG
        self.baseURL = URL(string: "http://192.168.110.205:3000")! // Local server (LAN IP)
        #else
        self.baseURL = URL(string: "https://plan-94cee.web.app")!
        #endif
        
        // Configure session with retry and timeout
        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = 30
        configuration.timeoutIntervalForResource = 60
        
        self.session = Session(configuration: configuration)
        
        // Configure JSON decoder
        self.decoder = JSONDecoder()
        self.decoder.keyDecodingStrategy = .convertFromSnakeCase
        self.decoder.dateDecodingStrategy = .iso8601
        
        // Configure JSON encoder
        self.encoder = JSONEncoder()
        self.encoder.keyEncodingStrategy = .convertToSnakeCase
        self.encoder.dateEncodingStrategy = .iso8601
    }
    
    // MARK: - Cities API
    
    /// Fetch all available cities
    func fetchCities() async throws -> [City] {
        let url = baseURL.appendingPathComponent("/api/cities")
        return try await request(url: url, method: .get)
    }
    
    /// Get city configuration by slug
    func fetchCity(slug: String) async throws -> City {
        let url = baseURL.appendingPathComponent("/api/cities/\(slug)")
        return try await request(url: url, method: .get)
    }
    
    // MARK: - Itinerary API
    
    /// Create a new itinerary
    func createItinerary(
        citySlug: String,
        query: String,
        date: Date,
        startTime: String? = nil
    ) async throws -> Itinerary {
        let url = baseURL.appendingPathComponent("/api/\(citySlug)/plan")
        
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        
        let body = CreateItineraryRequest(
            query: query,
            date: dateFormatter.string(from: date),
            startTime: startTime,
            preferences: nil
        )
        
        // Use generic request which decodes Itinerary directly (not wrapped in CreateItineraryResponse based on backend inspection)
        // Backend returns the Itinerary object directly with enriched fields
        let itinerary: Itinerary = try await request(
            url: url,
            method: .post,
            body: body
        )
        
        return itinerary
    }
    
    // MARK: - Mock Data
    
    private func getMockItinerary() -> Itinerary {
        let places = [
            Itinerary.ScheduledPlace(
                placeId: "p1",
                name: "The British Museum",
                address: "Great Russell St, London WC1B 3DG",
                location: Place.Location(lat: 51.5194, lng: -0.1270),
                scheduledTime: "10:00",
                duration: 120,
                types: ["museum", "tourist_attraction"],
                rating: 4.7,
                alternatives: nil,
                activityDescription: "Explore world history and culture."
            ),
            Itinerary.ScheduledPlace(
                placeId: "p2",
                name: "Covent Garden",
                address: "Covent Garden, London WC2E 8RF",
                location: Place.Location(lat: 51.5117, lng: -0.1240),
                scheduledTime: "12:30",
                duration: 90,
                types: ["shopping_mall", "tourist_attraction"],
                rating: 4.6,
                alternatives: nil,
                activityDescription: "Enjoy lunch and street performers."
            ),
            Itinerary.ScheduledPlace(
                placeId: "p3",
                name: "Dishoom Covent Garden",
                address: "12 Upper St Martin's Ln, London WC2H 9FB",
                location: Place.Location(lat: 51.5124, lng: -0.1265),
                scheduledTime: "14:00",
                duration: 60,
                types: ["restaurant", "food"],
                rating: 4.8,
                alternatives: nil,
                activityDescription: "Famous Bombay café style dining."
            )
        ]
        
        return Itinerary(
            id: 12345,
            title: "London Highlights",
            description: "A perfect day exploring culture and food.",
            planDate: Date(),
            query: "London highlights",
            places: places,
            travelTimes: [],
            created: Date(),
            weather: Itinerary.WeatherInfo(
                temperature: 18.5,
                condition: "Sunny",
                icon: "sun.max.fill",
                description: "Clear sky"
            ),
            city: "London"
        )
    }
    
    /// Fetch an existing itinerary by ID
    func fetchItinerary(citySlug: String, id: Int) async throws -> Itinerary {
        let url = baseURL.appendingPathComponent("/api/\(citySlug)/itinerary/\(id)")
        return try await request(url: url, method: .get)
    }
    
    // MARK: - Weather API
    
    /// Fetch weather for a city
    func fetchWeather(citySlug: String, date: Date) async throws -> Itinerary.WeatherInfo {
        let url = baseURL.appendingPathComponent("/api/\(citySlug)/weather")
        return try await request(url: url, method: .get)
    }
    
    // MARK: - Generic Request Handler
    
    private func request<T: Codable>(
        url: URL,
        method: HTTPMethod,
        body: Encodable? = nil
    ) async throws -> T {
        var request = URLRequest(url: url)
        request.httpMethod = method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        
        if let body = body {
            request.httpBody = try encoder.encode(body)
        }
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            if let errorResponse = try? decoder.decode(APIResponse<EmptyResponse>.self, from: data) {
                throw APIError.serverError(errorResponse.error?.message ?? "Unknown error")
            }
            throw APIError.httpError(statusCode: httpResponse.statusCode)
        }
        
        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            print("Decoding error: \(error)")
            throw APIError.decodingError(error)
        }
    }
}

// MARK: - Error Types

enum APIError: LocalizedError {
    case invalidResponse
    case httpError(statusCode: Int)
    case serverError(String)
    case decodingError(Error)
    case networkError(Error)
    
    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Invalid response from server"
        case .httpError(let statusCode):
            return "Server returned error code \(statusCode)"
        case .serverError(let message):
            return message
        case .decodingError(let error):
            return "Failed to parse response: \(error.localizedDescription)"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        }
    }
}

// MARK: - Helper Types

struct EmptyResponse: Codable {}

// MARK: - HTTP Method

enum HTTPMethod: String {
    case get = "GET"
    case post = "POST"
    case put = "PUT"
    case delete = "DELETE"
}
