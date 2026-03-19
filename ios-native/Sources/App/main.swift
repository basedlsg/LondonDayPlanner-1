import SwiftUI
import Foundation

@MainActor
struct PlanYourPerfectDayApp: App {
    @StateObject private var cityManager = CityManager()
    @StateObject private var networkMonitor = NetworkMonitor()
    @StateObject private var locationManager = LocationManager()
    
    var body: some Scene {
        WindowGroup {
            SplashScreenView()
                .environmentObject(cityManager)
                .environmentObject(networkMonitor)
                .environmentObject(locationManager)
                .preferredColorScheme(.dark)
                .onOpenURL { url in
                    handleDeepLink(url)
                }
        }
    }
    
    private func handleDeepLink(_ url: URL) {
        // scheme://host/path format
        // plan://london/plan/123
        guard url.scheme == "plan" else { return }
        
        let pathComponents = url.pathComponents
        // Handle routing logic here
        // This is a placeholder for actual routing implementation
        print("Received deep link: \(url.absoluteString)")
        
        if let host = url.host {
            // Attempt to switch city based on host
            if let city = cityManager.city(for: host) {
                cityManager.selectCity(city)
            }
        }
    }
    init() {
        print("DEBUG: PlanYourPerfectDayApp init")
    }
}

PlanYourPerfectDayApp.main()
