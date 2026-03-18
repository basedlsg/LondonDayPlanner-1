import SwiftUI
import MapKit

/// Displays a generated itinerary with timeline and venue cards
struct ItineraryView: View {
    let itinerary: Itinerary
    @State private var selectedPlace: Itinerary.ScheduledPlace?
    @State private var showShareSheet = false
    @State private var showMap = false
    
    var body: some View {
        ZStack {
            LiquidBackground()
                .ignoresSafeArea()
            
            ScrollView {
                VStack(spacing: 0) {

                    
                    // Timeline
                    timelineSection
                    
                    Spacer(minLength: 100)
                }
                .padding(DesignTokens.Spacing.md)
            }
        }
        .navigationTitle(itinerary.title ?? NSLocalizedString("itinerary.title", comment: "Your Itinerary"))
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                HStack(spacing: 12) {
                    Button {
                        showMap = true
                    } label: {
                        Image(systemName: "map")
                    }
                    
                    Button {
                        showShareSheet = true
                    } label: {
                        Image(systemName: "square.and.arrow.up")
                    }
                }
                .tint(Color.accentPink)
            }
        }
        .sheet(isPresented: $showShareSheet) {
            ShareSheet(itinerary: itinerary)
                .presentationDetents([.medium])
        }
        .sheet(isPresented: $showMap) {
            ItineraryMapViewFull(places: itinerary.places)
        }
        .sheet(item: $selectedPlace) { place in
            PlaceDetailSheet(place: place)
                .presentationDetents([.medium, .large])
        }
    }
    

    
    // MARK: - Timeline Section
    
    private var timelineSection: some View {
        VStack(spacing: 0) {
            ForEach(Array(itinerary.places.enumerated()), id: \.element.id) { index, place in
                VStack(spacing: 0) {
                    // Venue card
                    VenueCard(place: place) {
                        selectedPlace = place
                    }
                    
                    // Travel time indicator (except after last item)
                    if index < itinerary.places.count - 1 {
                        TravelTimeIndicator(
                            travelTime: travelTime(from: place, to: itinerary.places[index + 1])
                        )
                    }
                }
            }
        }
    }
    
    // MARK: - Helpers
    

    
    private func travelTime(from: Itinerary.ScheduledPlace, to: Itinerary.ScheduledPlace) -> Itinerary.TravelTime? {
        itinerary.travelTimes?.first { $0.from == from.placeId && $0.to == to.placeId }
    }
    
    private func weatherIcon(for condition: String) -> String {
        switch condition.lowercased() {
        case let c where c.contains("sun") || c.contains("clear"): return "sun.max.fill"
        case let c where c.contains("cloud"): return "cloud.fill"
        case let c where c.contains("rain"): return "cloud.rain.fill"
        case let c where c.contains("snow"): return "cloud.snow.fill"
        case let c where c.contains("thunder"): return "cloud.bolt.fill"
        default: return "cloud.fill"
        }
    }
}

// MARK: - Venue Card

struct VenueCard: View {
    let place: Itinerary.ScheduledPlace
    let onTap: () -> Void
    
    var body: some View {
        GlassCard(variant: .frosted) {
            Button(action: onTap) {
                HStack(alignment: .top, spacing: DesignTokens.Spacing.sm) {
                    // Time badge
                    VStack {
                        Text(place.scheduledTime)
                            .font(.system(size: 14, weight: .bold, design: .monospaced))
                            .foregroundStyle(Color.accentPink)
                    }
                    .frame(width: 60)
                    
                    // Venue info
                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                        Text(place.name)
                            .font(.headline)
                            .foregroundStyle(DesignTokens.Colors.textPrimary)
                            .lineLimit(2)
                        
                        Text(place.address)
                            .font(.caption)
                            .foregroundStyle(DesignTokens.Colors.textSecondary)
                            .lineLimit(1)
                        
                        if let description = place.activityDescription {
                            Text(description)
                                .font(.subheadline)
                                .foregroundStyle(DesignTokens.Colors.textSecondary)
                                .lineLimit(2)
                                .padding(.top, 4)
                        }
                        
                        // Rating and duration
                        HStack(spacing: DesignTokens.Spacing.md) {
                            if let rating = place.rating {
                                HStack(spacing: 2) {
                                    Image(systemName: "star.fill")
                                        .foregroundStyle(Color.yellow)
                                    Text(String(format: "%.1f", rating))
                                        .foregroundStyle(DesignTokens.Colors.textSecondary)
                                }
                                .font(.caption)
                            }
                            
                            if let duration = place.duration {
                                HStack(spacing: 2) {
                                    Image(systemName: "clock")
                                        .foregroundStyle(Color.accentBlue)
                                    Text(String(format: NSLocalizedString("itinerary.minutes", comment: "%@ min"), "\(duration)"))
                                        .foregroundStyle(DesignTokens.Colors.textSecondary)
                                }
                                .font(.caption)
                            }
                            
                            Spacer()
                            
                            // Alternatives indicator
                            if let alternatives = place.alternatives, !alternatives.isEmpty {
                                HStack(spacing: 2) {
                                    Image(systemName: "arrow.left.arrow.right")
                                    Text("+\(alternatives.count)")
                                }
                                .font(.caption)
                                .foregroundStyle(Color.accentBlue)
                            }
                        }
                        .padding(.top, 4)
                    }
                    
                    Spacer(minLength: 0)
                    
                    Image(systemName: "chevron.right")
                        .foregroundStyle(DesignTokens.Colors.textSecondary)
                }
                .padding(DesignTokens.Spacing.md)
            }
        }
    }
}

// MARK: - Travel Time Indicator

struct TravelTimeIndicator: View {
    let travelTime: Itinerary.TravelTime?
    
    var body: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            // Dotted line
            VStack(spacing: 4) {
                ForEach(0..<3, id: \.self) { _ in
                    Circle()
                        .fill(DesignTokens.Colors.borderMedium)
                        .frame(width: 4, height: 4)
                }
            }
            .frame(width: 60)
            
            // Travel info
            if let travel = travelTime {
                HStack(spacing: DesignTokens.Spacing.xxs) {
                    Image(systemName: modeIcon(for: travel.mode))
                        .foregroundStyle(Color.accentBlue)
                    Text(travel.durationText)
                        .foregroundStyle(DesignTokens.Colors.textSecondary)
                }
                .font(.caption)
                .padding(.horizontal, DesignTokens.Spacing.sm)
                .padding(.vertical, DesignTokens.Spacing.xxs)
                .background(.ultraThinMaterial)
                .clipShape(Capsule())
            }
            
            Spacer()
        }
        .padding(.vertical, DesignTokens.Spacing.sm)
    }
    
    private func modeIcon(for mode: Itinerary.TravelTime.TransportMode?) -> String {
        switch mode {
        case .walking: return "figure.walk"
        case .transit: return "tram.fill"
        case .driving: return "car.fill"
        case nil: return "arrow.down"
        }
    }
}

// MARK: - Place Detail Sheet

struct PlaceDetailSheet: View {
    let place: Itinerary.ScheduledPlace
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationStack {
            ZStack {
                LiquidBackground()
                    .ignoresSafeArea()
                
                ScrollView {
                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                        // Main info
                        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                            Text(place.name)
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundStyle(DesignTokens.Colors.textPrimary)
                            
                            Text(place.address)
                                .font(.subheadline)
                                .foregroundStyle(DesignTokens.Colors.textSecondary)
                            
                            HStack {
                                Text(place.scheduledTime)
                                    .font(.headline)
                                    .foregroundStyle(Color.accentPink)
                                
                                if let duration = place.duration {
                                    Text("• " + String(format: NSLocalizedString("itinerary.minutes", comment: "%@ min"), "\(duration)"))
                                        .foregroundStyle(DesignTokens.Colors.textSecondary)
                                }
                                
                                if let rating = place.rating {
                                    HStack(spacing: 2) {
                                        Image(systemName: "star.fill")
                                            .foregroundStyle(Color.yellow)
                                        Text(String(format: "%.1f", rating))
                                    }
                                }
                            }
                            .font(.subheadline)
                        }
                        
                        // Activity description
                        if let description = place.activityDescription {
                            GlassCard(variant: .light) {
                                Text(description)
                                    .foregroundStyle(DesignTokens.Colors.textPrimary)
                                    .padding(DesignTokens.Spacing.md)
                            }
                        }
                        
                        // Alternatives
                        if let alternatives = place.alternatives, !alternatives.isEmpty {
                            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                                Text(NSLocalizedString("itinerary.alternatives.title", comment: "Alternatives"))
                                    .font(.headline)
                                    .foregroundStyle(DesignTokens.Colors.textPrimary)
                                
                                ForEach(alternatives, id: \.id) { alt in
                                    GlassCard(variant: .light) {
                                        HStack {
                                            VStack(alignment: .leading) {
                                                Text(alt.name)
                                                    .font(.subheadline)
                                                    .foregroundStyle(DesignTokens.Colors.textPrimary)
                                                Text(alt.address)
                                                    .font(.caption)
                                                    .foregroundStyle(DesignTokens.Colors.textSecondary)
                                            }
                                            Spacer()
                                            if let rating = alt.rating {
                                                HStack(spacing: 2) {
                                                    Image(systemName: "star.fill")
                                                        .foregroundStyle(Color.yellow)
                                                    Text(String(format: "%.1f", rating))
                                                        .foregroundStyle(DesignTokens.Colors.textSecondary)
                                                }
                                                .font(.caption)
                                            }
                                        }
                                        .padding(DesignTokens.Spacing.sm)
                                    }
                                }
                            }
                        }
                        
                        // Actions
                        HStack(spacing: DesignTokens.Spacing.md) {
                            GlassButton(NSLocalizedString("itinerary.directions", comment: "Get Directions"), icon: "arrow.triangle.turn.up.right.diamond", style: .secondary) {
                                openInMaps()
                            }
                            
                            GlassButton(NSLocalizedString("itinerary.call", comment: "Call"), icon: "phone", style: .ghost) {
                                // TODO: Implement call
                            }
                        }
                        .padding(.top, DesignTokens.Spacing.md)
                    }
                    .padding()
                }
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(NSLocalizedString("common.done", comment: "Done")) { dismiss() }
                        .tint(.accentPink)
                }
            }
        }
    }
    
    private func openInMaps() {
        let coordinate = place.location
        let url = URL(string: "maps://?daddr=\(coordinate.lat),\(coordinate.lng)")!
        UIApplication.shared.open(url)
    }
}

// MARK: - Share Sheet

struct ShareSheet: View {
    let itinerary: Itinerary
    @Environment(\.dismiss) private var dismiss
    @StateObject private var calendarService = CalendarService()
    @State private var pdfService = PDFService()
    @State private var isExporting = false
    @State private var showNativeShare = false
    @State private var shareItems: [Any] = []
    @State private var message: String?
    
    var body: some View {
        NavigationStack {
            ZStack {
                LiquidBackground()
                    .ignoresSafeArea()
                
                VStack(spacing: DesignTokens.Spacing.lg) {
                    Text(NSLocalizedString("itinerary.share.title", comment: "Share Itinerary"))
                        .font(.headline)
                        .foregroundStyle(DesignTokens.Colors.textPrimary)
                    
                    if isExporting {
                        ProgressView()
                            .tint(.accentPink)
                        Text(NSLocalizedString("itinerary.share.exporting", comment: "Exporting..."))
                            .foregroundStyle(DesignTokens.Colors.textSecondary)
                    } else {
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: DesignTokens.Spacing.md) {
                            ShareOption(icon: "doc.richtext", title: NSLocalizedString("itinerary.share.pdf", comment: "Export PDF")) {
                                exportPDF()
                            }
                            
                            ShareOption(icon: "calendar.badge.plus", title: NSLocalizedString("itinerary.share.calendar", comment: "Add to Calendar")) {
                                addToCalendar()
                            }
                            
                            ShareOption(icon: "message", title: NSLocalizedString("itinerary.share.messages", comment: "Messages")) {
                                // TODO: Message specific formatting
                                shareNative(items: [generateShareText()])
                            }
                            
                            ShareOption(icon: "square.and.arrow.up", title: NSLocalizedString("itinerary.share.more", comment: "More...")) {
                                shareNative(items: [generateShareText()])
                            }
                        }
                    }
                    
                    if let message = message {
                        Text(message)
                            .font(.caption)
                            .foregroundStyle(DesignTokens.Colors.textPrimary)
                            .padding()
                            .background(.ultraThinMaterial)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                            .transition(.move(edge: .bottom).combined(with: .opacity))
                    }
                    
                    Spacer()
                }
                .padding()
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(NSLocalizedString("common.done", comment: "Done")) { dismiss() }
                        .tint(.accentPink)
                }
            }
            .sheet(isPresented: $showNativeShare) {
                ActivityViewController(activityItems: shareItems)
            }
        }
    }
    
    private func exportPDF() {
        isExporting = true
        Task {
            if let url = await pdfService.generatePDF(for: itinerary) {
                shareNative(items: [url])
            } else {
                showMessage("Failed to generate PDF")
            }
            isExporting = false
        }
    }
    
    private func addToCalendar() {
        isExporting = true
        Task {
            do {
                if await calendarService.requestPermission() {
                    let count = try await calendarService.exportItinerary(itinerary)
                    showMessage("Added \(count) events to Calendar")
                } else {
                    showMessage("Calendar access denied")
                }
            } catch {
                showMessage("Error: \(error.localizedDescription)")
            }
            isExporting = false
        }
    }
    
    private func generateShareText() -> String {
        var text = "My Day in \(itinerary.city?.capitalized ?? "London"): \(itinerary.title ?? "")\n\n"
        for place in itinerary.places {
            text += "📍 \(place.scheduledTime) - \(place.name)\n"
        }
        return text
    }
    
    private func shareNative(items: [Any]) {
        shareItems = items
        showNativeShare = true
    }
    
    private func showMessage(_ msg: String) {
        withAnimation {
            message = msg
        }
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
            withAnimation {
                message = nil
            }
        }
    }
}

struct ShareOption: View {
    let icon: String
    let title: String
    let action: () -> Void
    
    var body: some View {
        GlassCard(variant: .light) {
            Button(action: action) {
                VStack(spacing: DesignTokens.Spacing.sm) {
                    Image(systemName: icon)
                        .font(.title)
                        .foregroundStyle(Color.accentPink)
                    
                    Text(title)
                        .font(.caption)
                        .foregroundStyle(DesignTokens.Colors.textSecondary)
                }
                .frame(maxWidth: .infinity)
                .padding(DesignTokens.Spacing.md)
            }
        }
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        ItineraryView(itinerary: .preview)
    }
}

// MARK: - Preview Data

extension Itinerary {
    static let preview = Itinerary(
        id: 1,
        title: "A Perfect Day in London",
        description: "Exploring coffee shops, museums, and great food",
        planDate: Date(),
        query: "Coffee at 10am, museum, lunch in Soho",
        places: [
            ScheduledPlace(
                placeId: "1",
                name: "Monmouth Coffee Company",
                address: "27 Monmouth St, London WC2H 9EU",
                location: Place.Location(lat: 51.5144, lng: -0.1268),
                scheduledTime: "10:00 AM",
                duration: 45,
                types: ["cafe"],
                rating: 4.5,
                alternatives: nil,
                activityDescription: "Enjoy artisanal coffee and pastries"
            ),
            ScheduledPlace(
                placeId: "2",
                name: "British Museum",
                address: "Great Russell St, London WC1B 3DG",
                location: Place.Location(lat: 51.5194, lng: -0.1270),
                scheduledTime: "11:00 AM",
                duration: 180,
                types: ["museum"],
                rating: 4.8,
                alternatives: nil,
                activityDescription: "Explore world history and artifacts"
            ),
            ScheduledPlace(
                placeId: "3",
                name: "Bar Italia",
                address: "22 Frith St, London W1D 4RF",
                location: Place.Location(lat: 51.5133, lng: -0.1313),
                scheduledTime: "2:00 PM",
                duration: 60,
                types: ["restaurant"],
                rating: 4.3,
                alternatives: nil,
                activityDescription: "Classic Italian lunch in Soho"
            )
        ],
        travelTimes: [
            TravelTime(from: "1", to: "2", durationMinutes: 12, durationText: "12 min walk", mode: .walking),
            TravelTime(from: "2", to: "3", durationMinutes: 8, durationText: "8 min walk", mode: .walking)
        ],
        created: Date(),
        weather: WeatherInfo(temperature: 18, condition: "Partly Cloudy", icon: "cloud.sun", description: nil),
        city: "london"
    )
}
