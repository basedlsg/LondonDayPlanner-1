import XCTest
@testable import PlanYourPerfectDay

/// Tests for API client functionality
final class APIClientTests: XCTestCase {
    
    // MARK: - City Decoding Tests
    
    func testCityDecoding() throws {
        let json = """
        {
            "id": "london",
            "slug": "london",
            "name": "London",
            "country": "UK",
            "timezone": "Europe/London",
            "currency": "GBP",
            "language": "en",
            "majorAreas": [
                {
                    "name": "Central London",
                    "aliases": ["West End", "City"]
                }
            ],
            "defaultCenter": {
                "lat": 51.5074,
                "lng": -0.1278
            }
        }
        """.data(using: .utf8)!
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        
        let city = try decoder.decode(City.self, from: json)
        
        XCTAssertEqual(city.id, "london")
        XCTAssertEqual(city.name, "London")
        XCTAssertEqual(city.country, "UK")
        XCTAssertEqual(city.majorAreas.count, 1)
        XCTAssertEqual(city.majorAreas.first?.name, "Central London")
        XCTAssertEqual(city.defaultCenter.lat, 51.5074, accuracy: 0.0001)
    }
    
    // MARK: - Itinerary Decoding Tests
    
    func testItineraryDecoding() throws {
        let json = """
        {
            "id": 1,
            "title": "A Day in London",
            "query": "Coffee at 10am, museum, lunch",
            "places": [
                {
                    "placeId": "abc123",
                    "name": "Monmouth Coffee",
                    "address": "27 Monmouth St",
                    "location": { "lat": 51.5144, "lng": -0.1268 },
                    "scheduledTime": "10:00 AM"
                }
            ],
            "travelTimes": [],
            "created": "2026-01-24T00:00:00Z"
        }
        """.data(using: .utf8)!
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601
        
        let itinerary = try decoder.decode(Itinerary.self, from: json)
        
        XCTAssertEqual(itinerary.id, 1)
        XCTAssertEqual(itinerary.title, "A Day in London")
        XCTAssertEqual(itinerary.places.count, 1)
        XCTAssertEqual(itinerary.places.first?.name, "Monmouth Coffee")
        XCTAssertEqual(itinerary.places.first?.scheduledTime, "10:00 AM")
    }
    
    // MARK: - Place Decoding Tests
    
    func testPlaceDecoding() throws {
        let json = """
        {
            "id": "place-1",
            "placeId": "ChIJ123",
            "name": "British Museum",
            "address": "Great Russell St, London",
            "location": { "lat": 51.5194, "lng": -0.1270 },
            "types": ["museum", "tourist_attraction"],
            "rating": 4.8,
            "isPrimary": true,
            "isOutdoorVenue": false
        }
        """.data(using: .utf8)!
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        
        let place = try decoder.decode(Place.self, from: json)
        
        XCTAssertEqual(place.name, "British Museum")
        XCTAssertEqual(place.rating, 4.8)
        XCTAssertEqual(place.types?.count, 2)
        XCTAssertEqual(place.isPrimary, true)
        XCTAssertEqual(place.isOutdoorVenue, false)
    }
    
    // MARK: - Travel Time Decoding Tests
    
    func testTravelTimeDecoding() throws {
        let json = """
        {
            "from": "place1",
            "to": "place2",
            "durationMinutes": 12,
            "durationText": "12 min walk",
            "mode": "walking"
        }
        """.data(using: .utf8)!
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        
        let travelTime = try decoder.decode(Itinerary.TravelTime.self, from: json)
        
        XCTAssertEqual(travelTime.from, "place1")
        XCTAssertEqual(travelTime.to, "place2")
        XCTAssertEqual(travelTime.durationMinutes, 12)
        XCTAssertEqual(travelTime.durationText, "12 min walk")
        XCTAssertEqual(travelTime.mode, .walking)
    }
}

/// Tests for CityManager
final class CityManagerTests: XCTestCase {
    
    @MainActor
    func testFallbackCities() async {
        let manager = CityManager()
        
        // Wait for initial load
        try? await Task.sleep(nanoseconds: 100_000_000)
        
        // Should have fallback cities if API fails
        XCTAssertFalse(manager.cities.isEmpty)
        XCTAssertNotNil(manager.currentCity)
    }
    
    @MainActor
    func testCitySelection() async {
        let manager = CityManager()
        
        try? await Task.sleep(nanoseconds: 100_000_000)
        
        guard let london = manager.cities.first(where: { $0.slug == "london" }) else {
            XCTFail("London not found in cities")
            return
        }
        
        manager.selectCity(london)
        
        XCTAssertEqual(manager.currentCity?.slug, "london")
    }
}
