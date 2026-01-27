import SwiftUI

// 1. Data Model representing the "Cards"
struct CityDestination: Identifiable {
    let id: String // Changed to String to match City.slug/id
    let name: String
    let subtitle: String
    let iconName: String
    let themeColor: Color // The "Brand Color" for the icon
}

struct CityPickerSheet: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var locationManager: LocationManager
    
    // Adapted Props
    let cities: [City]
    let selectedCity: City?
    let onSelect: (City) -> Void
    
    // Computed destinations based on available cities
    private var destinations: [CityDestination] {
        cities.map { city in
            // Map City to CityDestination with custom styling logic
            let isStatsActive = city.slug == "nyc" // Example logic for "ACTIVE" tag if needed
            
            let subtitle: String
            let icon: String
            
            // Custom mapping for styling to match the user's "Exact Copy" request
            switch city.slug {
            case "nyc":
                subtitle = "USA • ACTIVE"
                icon = "building.2.fill"
            case "london":
                subtitle = "UNITED KINGDOM"
                icon = "building.columns.fill"
            case "boston":
                subtitle = "MASSACHUSETTS"
                icon = "graduationcap.fill"
            case "austin":
                subtitle = "TEXAS"
                icon = "music.note"
            case "sf", "san-francisco":
                subtitle = "CALIFORNIA"
                icon = "mountain.2.fill"
            default:
                subtitle = city.country.uppercased()
                icon = city.symbolIcon
            }
            
            return CityDestination(
                id: city.id,
                name: city.name,
                subtitle: subtitle,
                iconName: icon,
                themeColor: Color.gray // Default, overridden in view based on selection
            )
        }
    }
    
    var body: some View {
        ZStack {
            // 1. BACKGROUND: Force Opaque White + Cyan Tint
            // This prevents the "Dark Gray" sheet background from showing through
            Color.white.ignoresSafeArea()
            
            // 2. THE ATMOSPHERE: Light Cyan Gradient (Top Only)
            LinearGradient(
                colors: [
                    Color(hex: "D0F5FA"), // Ice Blue (Light)
                    Color.white.opacity(0.0) // Fades to transparent
                ],
                startPoint: .top,
                endPoint: .init(x: 0.5, y: 0.4) // Stops 40% down
            )
            .ignoresSafeArea()
            
            VStack(spacing: 0) { // Spacing 0 to control layout manually
                // --- HEADER ---
                HStack(alignment: .center) {
                    Text("Select Destination")
                        .font(.custom("RozhaOne-Regular", size: 26)) // Your serif font
                        .foregroundStyle(Color.black.opacity(0.85))
                    
                    Spacer()
                    
                    Button {
                        dismiss()
                    } label: {
                        Text("CANCEL")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(Color.gray.opacity(0.8)) // FIX: Gray text, not white
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(
                                Capsule()
                                    .fill(Color.white)
                                    // Soft shadow only
                                    .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)
                            )
                    }
                }
                .padding(.top, 24)
                .padding(.horizontal, 24)
                .padding(.bottom, 24)
                
                // --- LIST ---
                ScrollView {
                    VStack(spacing: 16) {
                        ForEach(destinations) { destination in
                            CityOptionCard(
                                city: destination,
                                isSelected: selectedCity?.id == destination.id
                            )
                            .onTapGesture {
                                withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                    if let city = cities.first(where: { $0.id == destination.id }) {
                                        onSelect(city)
                                    }
                                }
                            }
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 120) // Space for bottom button
                }
                .scrollIndicators(.hidden)
            }
            
            // --- BOTTOM BUTTON ---
            VStack {
                Spacer()
                Button {
                    // Action: Use Location
                    print("DEBUG: Share Location Tapped")
                    locationManager.requestPermission()
                    locationManager.requestLocation()
                } label: {
                    HStack {
                        Image(systemName: "location.north.circle.fill")
                        Text("Share my location")
                            .fontWeight(.semibold)
                    }
                    .foregroundColor(Color(hex: "006064")) // Dark Cyan Text
                    .frame(maxWidth: .infinity)
                    .frame(height: 56)
                    // GLASS MATERIAL FIX
                    .background(
                        RoundedRectangle(cornerRadius: 16)
                            .fill(Color(hex: "D0F5FA").opacity(0.5)) // High transparency Cyan
                    )
                    .background(Material.ultraThinMaterial) // The blur
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(Color(hex: "3ACCE1").opacity(0.3), lineWidth: 1)
                    )
                    .shadow(color: Color(hex: "3ACCE1").opacity(0.15), radius: 10, y: 5)
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 20) // Lift off bottom
            }
        }
        // CRITICAL: Force Light Mode so the sheet is never dark gray
        .preferredColorScheme(.light)
        .onChange(of: locationManager.location) { newLocation in
            print("DEBUG: Location updated: \(String(describing: newLocation))")
            if newLocation != nil {
                Task {
                    print("DEBUG: Starting reverse geocode")
                    await locationManager.reverseGeocodeLocation()
                }
            }
        }
        .onChange(of: locationManager.placemark) { placemark in
            print("DEBUG: Placemark received: \(String(describing: placemark))")
            guard let city = placemark?.locality else { 
                print("DEBUG: No locality in placemark")
                return 
            }
            print("DEBUG: Locality found: \(city)")
            
            // Find city matching locality
            if let found = cities.first(where: { $0.name.localizedCaseInsensitiveContains(city) }) {
                print("DEBUG: Match found! Selecting \(found.name)")
                withAnimation {
                    onSelect(found)
                }
            } else {
                print("DEBUG: No matching city found for \(city)")
            }
        }
    }
}

struct CityOptionCard: View {
    let city: CityDestination
    let isSelected: Bool
    
    var body: some View {
        HStack(spacing: 16) {
            // 1. Icon Box
            ZStack {
                // If selected: Solid Cyan. If not: White/Transparent
                Circle() // Changed to Circle for softer look or RoundedRect
                    .fill(isSelected ? Color(hex: "3ACCE1") : Color.white)
                
                Image(systemName: city.iconName)
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(isSelected ? .white : .gray)
            }
            .frame(width: 48, height: 48)
            .shadow(color: isSelected ? Color(hex: "3ACCE1").opacity(0.3) : .clear, radius: 5, y: 3)
            
            // 2. Text Info
            VStack(alignment: .leading, spacing: 4) {
                Text(city.name)
                    .font(.system(size: 17, weight: .bold))
                    .foregroundStyle(Color.black.opacity(0.9))
                
                Text(city.subtitle)
                    .font(.system(size: 10, weight: .bold))
                    .tracking(0.5)
                    .foregroundStyle(isSelected ? Color(hex: "006064") : Color.gray.opacity(0.5))
                    .textCase(.uppercase)
            }
            
            Spacer()
            
            // 3. Checkmark
            if isSelected {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 22))
                    .foregroundStyle(Color(hex: "3ACCE1")) // Cyan Checkmark
                    .background(Circle().fill(.white).padding(2)) // White backing for contrast
                    .transition(.scale.combined(with: .opacity))
            }
        }
        .padding(16)
        .background(
            ZStack {
                // ACTIVE STATE: Light Gradient Tint
                if isSelected {
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .fill(
                            LinearGradient(
                                colors: [
                                    Color(hex: "D0F5FA"), // Very light cyan
                                    Color.white
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                } else {
                    // INACTIVE STATE: Pure White
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .fill(Color.white)
                }
            }
        )
        // BORDER (Active Only)
        .overlay(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .strokeBorder(
                    isSelected ? Color(hex: "3ACCE1").opacity(0.3) : Color.clear, 
                    lineWidth: 1
                )
        )
        // SHADOWS
        .shadow(
            color: isSelected ? Color(hex: "3ACCE1").opacity(0.15) : Color.black.opacity(0.03),
            radius: isSelected ? 12 : 8,
            x: 0,
            y: isSelected ? 6 : 2
        )
        .scaleEffect(isSelected ? 1.0 : 0.99)
    }
}
