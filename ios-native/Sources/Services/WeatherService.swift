import Foundation

/// Service for fetching weather data
actor WeatherService {
    private let apiClient = APIClient.shared
    
    /// Fetch weather for a specific city and date
    /// - Parameters:
    ///   - citySlug: The city identifier (e.g., "london")
    ///   - date: The date to fetch weather for (defaults to now)
    /// - Returns: Weather info struct
    func getWeather(for citySlug: String, date: Date = Date()) async throws -> Itinerary.WeatherInfo {
        // In a real app, this would check if the date is close enough to use real-time API
        // or if it should provide historical averages/forecasts
        return try await apiClient.fetchWeather(citySlug: citySlug, date: date)
    }
    
    /// Get a user-friendly description for privacy/permissions
    static let usageDescription = "Weather data is used to suggest appropriate indoor or outdoor activities for your day."
}
