import Foundation
import SwiftUI

/// Manages city selection and configuration
@MainActor
class CityManager: ObservableObject {
    @Published var cities: [City] = []
    @Published var currentCity: City?
    @Published var isLoading: Bool = false
    @Published var error: Error?
    @Published var shouldAutoPlan: Bool = false
    @Published var autoPlanQuery: String?
    
    private let apiClient = APIClient.shared
    private let defaults = UserDefaults.standard
    private let lastCityKey = "lastSelectedCity"
    
    init() {
        Task {
            await loadCities()
        }
    }
    
    /// Load all available cities from API
    func loadCities() async {
        isLoading = true
        error = nil
        
        do {
            cities = try await apiClient.fetchCities()
            
            // Restore last selected city or default to first
            if let lastSlug = defaults.string(forKey: lastCityKey),
               let lastCity = cities.first(where: { $0.slug == lastSlug }) {
                currentCity = lastCity
            } else if let firstCity = cities.first {
                currentCity = firstCity
            }
        } catch {
            self.error = error
            // Use fallback cities if API fails
            cities = Self.fallbackCities
            currentCity = cities.first
        }
        
        isLoading = false
    }
    
    /// Select a city
    func selectCity(_ city: City) {
        currentCity = city
        defaults.set(city.slug, forKey: lastCityKey)
    }
    
    /// Get city by slug
    func city(for slug: String) -> City? {
        cities.first { $0.slug == slug }
    }
    
    // MARK: - Fallback Cities
    
    private static let fallbackCities: [City] = [
        City(
            id: "nyc",
            slug: "nyc",
            name: "New York City",
            country: "USA",
            timezone: "America/New_York",
            currency: "USD",
            language: "en",
            majorAreas: [
                City.Area(name: "Manhattan", aliases: ["Midtown", "Downtown"], center: nil),
                City.Area(name: "Brooklyn", aliases: nil, center: nil),
                City.Area(name: "Queens", aliases: nil, center: nil)
            ],
            defaultCenter: City.Coordinate(lat: 40.7128, lng: -74.0060)
        ),
        City(
            id: "london",
            slug: "london",
            name: "London",
            country: "UK",
            timezone: "Europe/London",
            currency: "GBP",
            language: "en",
            majorAreas: [
                City.Area(name: "Central London", aliases: ["West End", "City"], center: nil),
                City.Area(name: "South Bank", aliases: nil, center: nil),
                City.Area(name: "Camden", aliases: nil, center: nil)
            ],
            defaultCenter: City.Coordinate(lat: 51.5074, lng: -0.1278)
        ),
        City(
            id: "boston",
            slug: "boston",
            name: "Boston",
            country: "USA",
            timezone: "America/New_York",
            currency: "USD",
            language: "en",
            majorAreas: [
                City.Area(name: "Back Bay", aliases: nil, center: nil),
                City.Area(name: "Cambridge", aliases: ["Harvard", "MIT"], center: nil)
            ],
            defaultCenter: City.Coordinate(lat: 42.3601, lng: -71.0589)
        ),
        City(
            id: "austin",
            slug: "austin",
            name: "Austin",
            country: "USA",
            timezone: "America/Chicago",
            currency: "USD",
            language: "en",
            majorAreas: [
                City.Area(name: "Downtown", aliases: ["6th Street"], center: nil),
                City.Area(name: "South Congress", aliases: ["SoCo"], center: nil)
            ],
            defaultCenter: City.Coordinate(lat: 30.2672, lng: -97.7431)
        )
    ]
}
