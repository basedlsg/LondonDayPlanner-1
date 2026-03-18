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
        // self.baseURL = URL(string: "http://localhost:3000")! // Localhost for Simulator
        self.baseURL = URL(string: "https://london-day-planner-1.vercel.app")!
        #else
        self.baseURL = URL(string: "https://london-day-planner-1.vercel.app")!
        #endif
        
        // Configure session with retry and timeout
        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = 30
        configuration.timeoutIntervalForResource = 60
        
        self.session = Session(configuration: configuration)
        
        // Configure JSON decoder
        self.decoder = JSONDecoder()
        // Server returns camelCase keys. CodingKeys in Models.swift handle all
        // field name mappings (venues→places, time→scheduledTime, categories→types).
        // Do NOT use .convertFromSnakeCase — it double-converts CodingKey raw values
        // and breaks fields like travelTimes (expects travel_times) and planDate (expects plan_date).
        self.decoder.keyDecodingStrategy = .useDefaultKeys
        
        // Custom date decoder to handle both fractional ISO8601 and yyyy-MM-dd
        let isoFormatter = ISO8601DateFormatter()
        isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        
        let standardIsoFormatter = ISO8601DateFormatter()
        
        let ymdFormatter = DateFormatter()
        ymdFormatter.dateFormat = "yyyy-MM-dd"
        
        self.decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let dateString = try container.decode(String.self)
            
            if let date = isoFormatter.date(from: dateString) {
                return date
            }
            if let date = standardIsoFormatter.date(from: dateString) {
                return date
            }
            if let date = ymdFormatter.date(from: dateString) {
                return date
            }
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Cannot decode date string \(dateString)")
        }
        
        // Configure JSON encoder
        // Server expects camelCase keys (isPremium, startTime, etc.)
        // Do NOT use .convertToSnakeCase — server reads req.body.isPremium, not req.body.is_premium
        self.encoder = JSONEncoder()
        self.encoder.keyEncodingStrategy = .useDefaultKeys
        self.encoder.dateEncodingStrategy = .iso8601
    }
    
    // MARK: - Generic Request Handler
    
    private func request<T: Codable & Sendable>(
        url: URL,
        method: HTTPMethod,
        body: (any Encodable & Sendable)? = nil
    ) async throws -> T {
        let afMethod: Alamofire.HTTPMethod = {
            switch method {
            case .get: return .get
            case .post: return .post
            case .put: return .put
            case .delete: return .delete
            }
        }()
        
        var urlRequest = try URLRequest(url: url, method: afMethod)
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.setValue("application/json", forHTTPHeaderField: "Accept")
        
        if let body = body {
            urlRequest.httpBody = try encoder.encode(body)
        }
        
        // Wrap request in Alamofire for proper session management and retries
        let response = await session.request(urlRequest, interceptor: RetryInterceptor())
            .validate(statusCode: 200...299)
            .serializingDecodable(T.self, decoder: decoder)
            .response
        
        switch response.result {
        case .success(let value):
            return value
        case .failure(let error):
            if let responseData = response.data,
               let errorResponse = try? decoder.decode(APIResponse<EmptyResponse>.self, from: responseData) {
                throw APIError.serverError(errorResponse.error?.message ?? error.localizedDescription)
            }
            throw APIError.networkError(error)
        }
    }
    
    // MARK: - Cities API
    
    func fetchCities() async throws -> [City] {
        let url = baseURL.appendingPathComponent("/api/cities")
        return try await request(url: url, method: .get)
    }
    
    func fetchCity(slug: String) async throws -> City {
        let url = baseURL.appendingPathComponent("/api/cities/\(slug)")
        return try await request(url: url, method: .get)
    }
    
    // MARK: - Itinerary API
    
    func createItinerary(
        citySlug: String,
        query: String,
        date: Date,
        startTime: String? = nil,
        isPremium: Bool = false
    ) async throws -> Itinerary {
        let url = baseURL.appendingPathComponent("/api/\(citySlug)/plan")
        
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        
        let body = CreateItineraryRequest(
            query: query,
            date: dateFormatter.string(from: date),
            startTime: startTime,
            preferences: nil,
            isPremium: isPremium
        )
        
        let response: CreateItineraryResponse = try await request(
            url: url,
            method: .post,
            body: body
        )
        
        return response.itinerary
    }
    
    func fetchItinerary(citySlug: String, id: Int) async throws -> Itinerary {
        let url = baseURL.appendingPathComponent("/api/\(citySlug)/itinerary/\(id)")
        return try await request(url: url, method: .get)
    }
    
    // MARK: - Weather API
    
    func fetchWeather(citySlug: String, date: Date) async throws -> Itinerary.WeatherInfo {
        let url = baseURL.appendingPathComponent("/api/\(citySlug)/weather")
        return try await request(url: url, method: .get)
    }
}

// MARK: - Retry Interceptor (Production Stability)

final class RetryInterceptor: RequestInterceptor, Sendable {
    let maxRetryCount = 3
    let retryDelay: TimeInterval = 1.0
    
    func retry(_ request: Request, for session: Session, dueTo error: Error, completion: @escaping (RetryResult) -> Void) {
        let response = request.task?.response as? HTTPURLResponse
        
        if request.retryCount < maxRetryCount,
           (response?.statusCode == 500 || (error as NSError).domain == NSURLErrorDomain) {
            completion(.retryWithDelay(retryDelay))
        } else {
            completion(.doNotRetry)
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

struct EmptyResponse: Codable, Sendable {}

enum HTTPMethod: String {
    case get = "GET"
    case post = "POST"
    case put = "PUT"
    case delete = "DELETE"
}
