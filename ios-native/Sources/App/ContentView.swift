import SwiftUI

struct ContentView: View {
    @EnvironmentObject var cityManager: CityManager
    @EnvironmentObject var networkMonitor: NetworkMonitor
    @State private var selectedTab: Tab = .plan
    
    enum Tab: String, CaseIterable {
        case plan = "Plan"
        case trips = "Trips"
        case explore = "Explore"
        case settings = "Settings"
        
        var icon: String {
            switch self {
            case .plan: return "calendar.badge.plus"
            case .trips: return "map"
            case .explore: return "globe"
            case .settings: return "gearshape"
            }
        }
    }
    init() {
        // Configure the "Milk Glass" Tab Bar Appearance
        let appearance = UITabBarAppearance()
        appearance.configureWithTransparentBackground() // clear default
        
        // 1. The Blur Physics (UltraThin)
        appearance.backgroundEffect = UIBlurEffect(style: .systemUltraThinMaterial)
        
        // 2. The "Milk" Tint
        appearance.backgroundColor = UIColor.white.withAlphaComponent(0.5)
        
        // Optional: Border to match the card
        // appearance.shadowColor = UIColor.white.withAlphaComponent(0.4) 
        
        // Apply
        UITabBar.appearance().standardAppearance = appearance
        UITabBar.appearance().scrollEdgeAppearance = appearance
    }
    
    var body: some View {
        ZStack {
            // Liquid background
            LiquidBackground()
                .ignoresSafeArea()
            
            TabView(selection: $selectedTab) {
                NavigationStack {
                    HomeView()
                }
                .tabItem {
                    Label(Tab.plan.rawValue, systemImage: Tab.plan.icon)
                }
                .tag(Tab.plan)
                
                NavigationStack {
                    TripsView()
                }
                .tabItem {
                    Label(Tab.trips.rawValue, systemImage: Tab.trips.icon)
                }
                .tag(Tab.trips)
                
                NavigationStack {
                    ExploreView()
                }
                .tabItem {
                    Label(Tab.explore.rawValue, systemImage: Tab.explore.icon)
                }
                .tag(Tab.explore)
                
                NavigationStack {
                    SettingsView()
                }
                .tabItem {
                    Label(Tab.settings.rawValue, systemImage: Tab.settings.icon)
                }
                .tag(Tab.settings)
            }
            .tint(Color.accentPink)
            

        }
        .preferredColorScheme(.light)
    }
}

#Preview {
    ContentView()
        .environmentObject(CityManager())
        .environmentObject(NetworkMonitor())
}
