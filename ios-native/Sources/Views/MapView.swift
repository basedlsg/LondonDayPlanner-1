import SwiftUI
import MapKit

/// Map view displaying itinerary locations and routes
struct ItineraryMapViewFull: View {
    let places: [Itinerary.ScheduledPlace]
    @State private var region: MKCoordinateRegion
    @State private var selectedPlace: Itinerary.ScheduledPlace?
    @Environment(\.dismiss) private var dismiss
    
    init(places: [Itinerary.ScheduledPlace]) {
        self.places = places
        
        // Calculate initial region from places
        if let first = places.first {
            let center = CLLocationCoordinate2D(
                latitude: first.location.lat,
                longitude: first.location.lng
            )
            _region = State(initialValue: MKCoordinateRegion(
                center: center,
                span: MKCoordinateSpan(latitudeDelta: 0.05, longitudeDelta: 0.05)
            ))
        } else {
            // Default to London
            _region = State(initialValue: MKCoordinateRegion(
                center: CLLocationCoordinate2D(latitude: 51.5074, longitude: -0.1278),
                span: MKCoordinateSpan(latitudeDelta: 0.1, longitudeDelta: 0.1)
            ))
        }
    }
    
    var body: some View {
        NavigationStack {
            ZStack {
                // Map
                Map(coordinateRegion: $region, annotationItems: places) { place in
                    MapAnnotation(coordinate: CLLocationCoordinate2D(
                        latitude: place.location.lat,
                        longitude: place.location.lng
                    )) {
                        PlaceAnnotation(place: place, isSelected: selectedPlace?.id == place.id) {
                            withAnimation(.spring()) {
                                selectedPlace = place
                            }
                        }
                    }
                }
                .ignoresSafeArea(edges: .bottom)
                
                // Bottom card for selected place
                VStack {
                    Spacer()
                    
                    if let place = selectedPlace {
                        selectedPlaceCard(place)
                            .transition(.move(edge: .bottom).combined(with: .opacity))
                    }
                }
                .animation(.spring(), value: selectedPlace)
            }
            .navigationTitle(NSLocalizedString("map.title", comment: "Map"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(NSLocalizedString("map.done", comment: "Done")) { dismiss() }
                        .tint(Color.accentPink)
                }
                
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        fitAllPlaces()
                    } label: {
                        Image(systemName: "arrow.up.left.and.arrow.down.right")
                    }
                    .tint(Color.accentPink)
                }
            }
        }
    }
    
    private func selectedPlaceCard(_ place: Itinerary.ScheduledPlace) -> some View {
        GlassCard(variant: .heavy, glow: .pink) {
            HStack(spacing: DesignTokens.Spacing.md) {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                    Text(place.scheduledTime)
                        .font(.caption)
                        .foregroundStyle(Color.accentPink)
                    
                    Text(place.name)
                        .font(.headline)
                        .foregroundStyle(.white)
                        .lineLimit(1)
                    
                    Text(place.address)
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.6))
                        .lineLimit(1)
                }
                
                Spacer()
                
                Button {
                    openInMaps(place)
                } label: {
                    Image(systemName: "arrow.triangle.turn.up.right.diamond.fill")
                        .font(.title2)
                        .foregroundStyle(Color.accentBlue)
                }
            }
            .padding(DesignTokens.Spacing.md)
        }
        .padding()
    }
    
    private func fitAllPlaces() {
        guard !places.isEmpty else { return }
        
        let coordinates = places.map { 
            CLLocationCoordinate2D(latitude: $0.location.lat, longitude: $0.location.lng) 
        }
        
        let latitudes = coordinates.map { $0.latitude }
        let longitudes = coordinates.map { $0.longitude }
        
        let minLat = latitudes.min() ?? 0
        let maxLat = latitudes.max() ?? 0
        let minLng = longitudes.min() ?? 0
        let maxLng = longitudes.max() ?? 0
        
        let center = CLLocationCoordinate2D(
            latitude: (minLat + maxLat) / 2,
            longitude: (minLng + maxLng) / 2
        )
        
        let span = MKCoordinateSpan(
            latitudeDelta: (maxLat - minLat) * 1.5 + 0.01,
            longitudeDelta: (maxLng - minLng) * 1.5 + 0.01
        )
        
        withAnimation {
            region = MKCoordinateRegion(center: center, span: span)
        }
    }
    
    private func openInMaps(_ place: Itinerary.ScheduledPlace) {
        let url = URL(string: "maps://?daddr=\(place.location.lat),\(place.location.lng)")!
        UIApplication.shared.open(url)
    }
}

// MARK: - Place Annotation

struct PlaceAnnotation: View {
    let place: Itinerary.ScheduledPlace
    let isSelected: Bool
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 0) {
                ZStack {
                    Circle()
                        .fill(isSelected ? Color.accentPink : Color.accentBlue)
                        .frame(width: isSelected ? 44 : 36, height: isSelected ? 44 : 36)
                        .shadow(color: (isSelected ? Color.accentPink : Color.accentBlue).opacity(0.5), radius: 8)
                    
                    Image(systemName: iconForPlace)
                        .font(.system(size: isSelected ? 20 : 16))
                        .foregroundStyle(.white)
                }
                
                // Pin point
                Triangle()
                    .fill(isSelected ? Color.accentPink : Color.accentBlue)
                    .frame(width: 12, height: 8)
            }
        }
        .scaleEffect(isSelected ? 1.1 : 1.0)
        .animation(.spring(response: 0.3), value: isSelected)
    }
    
    private var iconForPlace: String {
        let types = place.types ?? []
        if types.contains("restaurant") || types.contains("food") {
            return "fork.knife"
        } else if types.contains("cafe") {
            return "cup.and.saucer.fill"
        } else if types.contains("museum") {
            return "building.columns.fill"
        } else if types.contains("bar") {
            return "wineglass.fill"
        }
        return "mappin"
    }
}

// MARK: - Triangle Shape

struct Triangle: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: rect.midX, y: rect.maxY))
        path.addLine(to: CGPoint(x: rect.minX, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))
        path.closeSubpath()
        return path
    }
}

#Preview {
    ItineraryMapViewFull(places: Itinerary.preview.places)
}
