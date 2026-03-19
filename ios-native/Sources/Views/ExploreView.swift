import SwiftUI

/// Explore cities and discover popular destinations
struct ExploreView: View {
    @EnvironmentObject var cityManager: CityManager
    @Binding var selectedTab: ContentView.Tab
    
    // Default init for preview compatibility (wrapped in binding)
    init(selectedTab: Binding<ContentView.Tab> = .constant(.explore)) {
        self._selectedTab = selectedTab
    }
    
    var body: some View {
        ZStack {
            // 1. Atmospheric Ambient Background
            HomeAmbientBackground()
            
            VStack(spacing: 0) {
                // Centered Header
                Text(NSLocalizedString("explore.title", value: "Explore", comment: "Explore title"))
                    .font(DesignTokens.Fonts.rozhaOne(size: 48))
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
                    .padding(.top, 40)
                    .padding(.bottom, DesignTokens.Spacing.lg)
                
                ScrollView {
                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
                        // Featured section
                        featuredSection
                        
                        // Cities section
                        citiesSection
                    }
                    .padding()
                }
            }
        }
        .toolbar(.hidden, for: .navigationBar)
    }
    
    private var featuredSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text(NSLocalizedString("explore.featured", value: "Featured Destinations", comment: "Featured section title"))
                .font(.headline)
                .foregroundStyle(DesignTokens.Colors.textPrimary)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: DesignTokens.Spacing.md) {
                    ForEach(cityManager.cities.prefix(4)) { city in
                        FeaturedCityCard(city: city)
                            .onTapGesture {
                                cityManager.selectCity(city)
                            }
                    }
                }
            }
        }
    }
    
    private var citiesSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text(NSLocalizedString("explore.allCities", value: "All Cities", comment: "All cities section title"))
                .font(.headline)
                .foregroundStyle(DesignTokens.Colors.textPrimary)
            
            LazyVStack(spacing: DesignTokens.Spacing.sm) {
                ForEach(cityManager.cities) { city in
                    NavigationLink {
                        CityDetailView(city: city, selectedTab: $selectedTab)
                    } label: {
                        CityRowCard(city: city)
                    }
                }
            }
        }
    }
}

// ... Cards remain same ...

// ... Cards are defined below ...

#Preview {
    NavigationStack {
        ExploreView()
    }
    .environmentObject(CityManager())
}

struct FeaturedCityCard: View {
    let city: City
    
    var body: some View {
        GlassCard(variant: .frosted, glow: .mixed, shimmer: true) {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                // City image
                ZStack {
                    Image(city.imageName)
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(width: 180, height: 100)
                        .overlay(
                            LinearGradient(
                                colors: [.black.opacity(0.1), .clear],
                                startPoint: .top,
                                endPoint: .bottom
                            )
                        )
                }
                .frame(width: 180, height: 100)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.medium))
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(city.name)
                        .font(.headline)
                        .foregroundStyle(DesignTokens.Colors.textPrimary)
                    
                    Text(city.country)
                        .font(.caption)
                        .foregroundStyle(DesignTokens.Colors.textSecondary)
                }
            }
            .padding(DesignTokens.Spacing.sm)
        }
        .frame(width: 200)
    }
}

struct CityRowCard: View {
    let city: City
    
    var body: some View {
        GlassCard(variant: .light) {
            HStack(spacing: DesignTokens.Spacing.md) {
                // City icon
                ZStack {
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: [Color.accentPink.opacity(0.2), Color.accentBlue.opacity(0.2)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                    
                    Image(systemName: city.symbolIcon)
                        .font(.title2)
                        .foregroundStyle(DesignTokens.Colors.textVibrantCyan)
                }
                .frame(width: 50, height: 50)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(city.name)
                        .font(.headline)
                        .foregroundStyle(DesignTokens.Colors.textPrimary)
                    
                    HStack {
                        Text(city.country)
                        Text("•")
                        Text("\(city.majorAreas.count) areas")
                    }
                    .font(.caption)
                    .foregroundStyle(DesignTokens.Colors.textSecondary)
                }
                
                Spacer()
                
                Image(systemName: "chevron.right")
                    .foregroundStyle(DesignTokens.Colors.textSecondary)
            }
            .padding(DesignTokens.Spacing.md)
        }
    }
}

struct CityDetailView: View {
    let city: City
    @Binding var selectedTab: ContentView.Tab
    @EnvironmentObject var cityManager: CityManager
    
    var body: some View {
        ZStack {
            LiquidBackground()
                .ignoresSafeArea()
            
            ScrollView {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
                    // Header
                    GlassCard(variant: .frosted, glow: .mixed) {
                        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                            HStack {
                                VStack(alignment: .leading) {
                                    Text(city.name)
                                        .font(DesignTokens.Fonts.rozhaOne(size: 36)) // FIXED FONT
                                        .foregroundStyle(DesignTokens.Colors.textPrimary)
                                    
                                    Text(city.country)
                                        .font(.title3)
                                        .foregroundStyle(DesignTokens.Colors.textSecondary)
                                }
                                
                                Spacer()
                            }
                            
                            // Quick facts
                            HStack(spacing: DesignTokens.Spacing.lg) {
                                VStack {
                                    Image(systemName: "clock")
                                        .foregroundStyle(Color.accentBlue)
                                    // FIXED FORMATTING
                                    Text(formatTimezone(city.timezone))
                                        .font(.caption)
                                        .foregroundStyle(DesignTokens.Colors.textSecondary)
                                }
                                
                                VStack {
                                    Image(systemName: "dollarsign.circle")
                                        .foregroundStyle(Color.accentPink)
                                    Text(city.currency)
                                        .font(.caption)
                                        .foregroundStyle(DesignTokens.Colors.textSecondary)
                                }
                            }
                        }
                        .padding(DesignTokens.Spacing.lg)
                    }
                    
                    // Major areas
                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                        Text(NSLocalizedString("explore.popularAreas", value: "Popular Areas", comment: "Popular areas"))
                            .font(.headline)
                            .foregroundStyle(DesignTokens.Colors.textPrimary)
                        
                        ForEach(city.majorAreas, id: \.name) { area in
                            Button {
                                cityManager.selectCity(city)
                                cityManager.autoPlanQuery = "Make me a perfect day in \(area.name)"
                                cityManager.shouldAutoPlan = true
                                selectedTab = .plan
                            } label: {
                                GlassCard(variant: .light) {
                                    HStack {
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(area.name)
                                                .font(.subheadline)
                                                .foregroundStyle(DesignTokens.Colors.textPrimary)
                                            
                                            if let aliases = area.aliases, !aliases.isEmpty {
                                                Text(aliases.joined(separator: ", "))
                                                    .font(.caption)
                                                    .foregroundStyle(DesignTokens.Colors.textSecondary)
                                            }
                                        }
                                        Spacer()
                                        
                                        Image(systemName: "sparkles")
                                            .font(.caption)
                                            .foregroundStyle(Color.accentPink)
                                    }
                                    .padding(DesignTokens.Spacing.md)
                                }
                            }
                        }
                    }
                    
                    // Plan button
                    // FIXED STYLE (.solidWhite AKA Home Style)
                    GlassButton("Plan a Day in \(city.name)", icon: "sparkles", style: .solidWhite) {
                        cityManager.selectCity(city)
                        cityManager.shouldAutoPlan = true
                        selectedTab = .plan
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, DesignTokens.Spacing.md)
                }
                .padding()
            }
        }
        .navigationBarTitleDisplayMode(.inline)
    }
    
    private func formatTimezone(_ timezone: String) -> String {
        let lastPart = timezone.components(separatedBy: "/").last ?? timezone
        return lastPart.replacingOccurrences(of: "_", with: " ")
    }
}

#Preview {
    NavigationStack {
        ExploreView()
    }
    .environmentObject(CityManager())
}
