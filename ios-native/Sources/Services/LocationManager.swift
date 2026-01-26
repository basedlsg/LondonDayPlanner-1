import Foundation
import CoreLocation
import Combine

/// Manages location services and permissions
@MainActor
class LocationManager: NSObject, ObservableObject {
    @Published var location: CLLocation?
    @Published var authorizationStatus: CLAuthorizationStatus = .notDetermined
    @Published var error: Error?
    @Published var placemark: CLPlacemark?
    
    private let locationManager = CLLocationManager()
    private let geocoder = CLGeocoder()
    
    override init() {
        super.init()
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyHundredMeters
        authorizationStatus = locationManager.authorizationStatus
    }
    
    /// Request permission to use location
    func requestPermission() {
        locationManager.requestWhenInUseAuthorization()
    }
    
    /// Request one-time location update
    func requestLocation() {
        locationManager.requestLocation()
    }
    
    /// Start continuous updates (use sparingly)
    func startUpdatingLocation() {
        locationManager.startUpdatingLocation()
    }
    
    /// Stop updates
    func stopUpdatingLocation() {
        locationManager.stopUpdatingLocation()
    }
    
    /// Reverse geocode the current location to get city/placemark
    func reverseGeocodeLocation() async {
        guard let location = location else { return }
        
        do {
            let placemarks = try await geocoder.reverseGeocodeLocation(location)
            self.placemark = placemarks.first
        } catch {
            print("Reverse geocoding error: \(error)")
        }
    }
}

extension LocationManager: @preconcurrency CLLocationManagerDelegate {
    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let status = manager.authorizationStatus
        Task { @MainActor in
            self.authorizationStatus = status
            
            if status == .authorizedWhenInUse || status == .authorizedAlways {
                self.requestLocation()
            }
        }
    }
    
    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        Task { @MainActor in
            self.location = location
            self.error = nil
        }
    }
    
    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        // Ignore "unknown location" errors which can happen temporarily
        if let clError = error as? CLError, clError.code == .locationUnknown {
            return
        }
        Task { @MainActor in
            self.error = error
        }
    }
}
