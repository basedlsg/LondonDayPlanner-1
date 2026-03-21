import SwiftUI
import MapKit
import Kingfisher

enum DirectionsAppChoice {
    case appleMaps
    case googleMaps
}

struct DirectionsDestination {
    let name: String
    let address: String
    let latitude: Double
    let longitude: Double

    private var destinationQuery: String {
        [name, address]
            .filter { !$0.isEmpty }
            .joined(separator: ", ")
    }

    private var encodedDestinationQuery: String {
        destinationQuery.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? destinationQuery
    }

    private var encodedCoordinates: String {
        "\(latitude),\(longitude)"
    }

    private var appleMapsURL: URL? {
        URL(string: "http://maps.apple.com/?daddr=\(encodedCoordinates)&q=\(encodedDestinationQuery)&dirflg=r")
    }

    private var googleMapsAppURL: URL? {
        URL(string: "comgooglemaps://?daddr=\(encodedCoordinates)&q=\(encodedDestinationQuery)&directionsmode=transit")
    }

    private var googleMapsWebURL: URL? {
        URL(string: "https://www.google.com/maps/dir/?api=1&destination=\(encodedCoordinates)&travelmode=transit")
    }

    func open(in app: DirectionsAppChoice) {
        switch app {
        case .appleMaps:
            guard let url = appleMapsURL else { return }
            UIApplication.shared.open(url)
        case .googleMaps:
            guard let appURL = googleMapsAppURL else { return }
            UIApplication.shared.open(appURL, options: [:]) { success in
                guard !success, let webURL = googleMapsWebURL else { return }
                UIApplication.shared.open(webURL)
            }
        }
    }
}

extension Itinerary.ScheduledPlace {
    var directionsDestination: DirectionsDestination {
        DirectionsDestination(
            name: name,
            address: address,
            latitude: location.lat,
            longitude: location.lng
        )
    }

    var dialURL: URL? {
        guard let phoneNumber else { return nil }
        let allowed = CharacterSet(charactersIn: "+0123456789")
        let sanitized = phoneNumber.unicodeScalars
            .filter { allowed.contains($0) }
            .map(String.init)
            .joined()

        guard !sanitized.isEmpty else { return nil }
        return URL(string: "tel://\(sanitized)")
    }
}

// MARK: - Stitch Color Palette

private enum StitchColors {
    static let primary = Color(hex: "006783")
    static let secondary = Color(hex: "97406d")
    static let onSurface = Color(hex: "273440")
    static let onSurfaceVariant = Color(hex: "54606e")
    static let surface = Color(hex: "f7f9ff")
}

/// Displays a generated itinerary with timeline and venue cards
struct ItineraryView: View {
    let itinerary: Itinerary
    @Environment(\.dismiss) private var dismiss
    @State private var selectedPlace: Itinerary.ScheduledPlace?
    @State private var showShareSheet = false
    @State private var showMap = false
    @State private var didAutoOpenDebugPlace = false
    private let shouldAutoOpenDebugPlace: Bool = {
        #if DEBUG
        ProcessInfo.processInfo.arguments.contains("--debug-open-place-detail")
        #else
        false
        #endif
    }()

    var body: some View {
        ZStack {
            // Light Gradient V1.3 background: pink top -> white middle -> light blue bottom
            LinearGradient(
                stops: [
                    .init(color: Color(hex: "fbe4ee"), location: 0.0),
                    .init(color: .white, location: 0.4),
                    .init(color: .white, location: 0.6),
                    .init(color: Color(hex: "d8f2f9"), location: 1.0)
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            ScrollView {
                VStack(spacing: 0) {
                    // Header section
                    headerSection
                        .padding(.bottom, 32)

                    // Timeline
                    timelineSection

                    Spacer(minLength: 100)
                }
                .padding(.horizontal, DesignTokens.Spacing.md)
                .padding(.top, DesignTokens.Spacing.md)
            }
        }
        .navigationTitle(itinerary.title ?? NSLocalizedString("itinerary.title", comment: "Your Itinerary"))
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden()
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 16, weight: .semibold))
                }
                .tint(StitchColors.secondary)
            }

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
                .tint(StitchColors.secondary)
            }
        }
        .sheet(isPresented: $showShareSheet) {
            ShareSheet(itinerary: itinerary)
                .presentationDetents([.medium])
        }
        .sheet(isPresented: $showMap) {
            ItineraryMapViewFull(places: itinerary.places)
        }
        .fullScreenCover(item: $selectedPlace) { place in
            PlaceDetailSheet(place: place)
        }
        .onAppear {
            guard !didAutoOpenDebugPlace else { return }
            guard shouldAutoOpenDebugPlace else { return }
            guard let debugPlace =
                itinerary.places.first(where: { !($0.alternatives?.isEmpty ?? true) })
                ?? itinerary.places.first(where: { $0.photoUrl != nil })
                ?? itinerary.places.last
            else { return }

            didAutoOpenDebugPlace = true
            selectedPlace = debugPlace
        }
    }

    // MARK: - Header Section

    private var headerSection: some View {
        VStack(spacing: 12) {
            // "Featured Itinerary" pill badge
            Text("FEATURED ITINERARY")
                .font(.custom("Poppins", size: 9))
                .fontWeight(.bold)
                .tracking(2.0)
                .foregroundStyle(StitchColors.secondary)
                .padding(.horizontal, 14)
                .padding(.vertical, 6)
                .background(Color.white.opacity(0.60))
                .clipShape(Capsule())

            // Large serif headline
            Text(itinerary.title ?? (itinerary.city?.capitalized ?? "London"))
                .font(.custom("RozhaOne-Regular", size: 34))
                .foregroundStyle(StitchColors.onSurface)
                .multilineTextAlignment(.center)
                .lineLimit(3)

            // Subtitle
            Text("A refined journey curated for the modern wanderer.")
                .font(.custom("Poppins", size: 14))
                .foregroundStyle(StitchColors.onSurfaceVariant)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 8)
    }

    // MARK: - Timeline Section

    private var timelineSection: some View {
        VStack(spacing: 0) {
            ForEach(Array(itinerary.places.enumerated()), id: \.element.id) { index, place in
                VStack(spacing: 0) {
                    // Timeline row: dot + connector on left, card on right
                    HStack(alignment: .top, spacing: 0) {
                        // Left timeline column: dot + vertical line
                        VStack(spacing: 0) {
                            // Timeline dot
                            Circle()
                                .fill(StitchColors.secondary)
                                .frame(width: 16, height: 16)
                                .overlay(
                                    Circle()
                                        .stroke(Color.white, lineWidth: 2.5)
                                )
                                .shadow(color: StitchColors.secondary.opacity(0.45), radius: 6, x: 0, y: 2)
                                .padding(.top, 18)

                            // Vertical connector line (extends to fill remaining space)
                            if index < itinerary.places.count - 1 {
                                Rectangle()
                                    .fill(Color.white.opacity(0.40))
                                    .frame(width: 2)
                                    .frame(maxHeight: .infinity)
                            }
                        }
                        .frame(width: 16)
                        .padding(.leading, 4)

                        // Venue card offset to the right
                        VenueCard(place: place) {
                            selectedPlace = place
                        }
                        .padding(.leading, 28)
                    }

                    // Travel time indicator (except after last item)
                    if index < itinerary.places.count - 1 {
                        HStack(alignment: .center, spacing: 0) {
                            // Align with the timeline column
                            Color.clear
                                .frame(width: 16)
                                .padding(.leading, 4)

                            TravelTimeIndicator(
                                travelTime: travelTime(after: index)
                            )
                            .padding(.leading, 28)
                        }
                    }
                }
            }
        }
    }

    // MARK: - Helpers

    private func travelTime(after index: Int) -> Itinerary.TravelTime? {
        guard let travelTimes = itinerary.travelTimes, travelTimes.indices.contains(index) else {
            return nil
        }
        return travelTimes[index]
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
        Button(action: onTap) {
            HStack(alignment: .top, spacing: 14) {
                // Thumbnail image 80x80 rounded-xl with shadow
                VenueCardThumbnail(place: place)
                    .frame(width: 80, height: 80)

                VStack(alignment: .leading, spacing: 6) {
                    // Top row: venue name + time badge + rating
                    HStack(alignment: .top, spacing: 8) {
                        // Venue name - serif headline
                        Text(place.name)
                            .font(.custom("RozhaOne-Regular", size: 18))
                            .foregroundStyle(StitchColors.primary)
                            .multilineTextAlignment(.leading)
                            .lineLimit(2)

                        Spacer(minLength: 0)

                        VStack(alignment: .trailing, spacing: 4) {
                            // Time badge
                            Text(place.scheduledTime.uppercased())
                                .font(.custom("Poppins", size: 10))
                                .fontWeight(.bold)
                                .tracking(1.2)
                                .foregroundStyle(StitchColors.secondary)

                            // Star rating
                            if let rating = place.rating {
                                HStack(spacing: 2) {
                                    Image(systemName: "star.fill")
                                        .font(.system(size: 9))
                                        .foregroundStyle(.yellow)
                                    Text(String(format: "%.1f", rating))
                                        .font(.custom("Poppins", size: 10))
                                        .fontWeight(.semibold)
                                        .foregroundStyle(StitchColors.onSurfaceVariant)
                                }
                            }
                        }
                    }

                    // Description text
                    if let description = place.activityDescription {
                        Text(description)
                            .font(.custom("Poppins", size: 11))
                            .foregroundStyle(StitchColors.onSurfaceVariant)
                            .lineSpacing(2)
                            .lineLimit(2)
                    }

                    // Category tag
                    if let category = place.types?.first, !category.isEmpty {
                        HStack(spacing: 4) {
                            Image(systemName: categoryIcon(for: category))
                                .font(.system(size: 9))
                            Text(category.uppercased())
                                .font(.custom("Poppins", size: 9))
                                .fontWeight(.bold)
                                .tracking(1.2)
                        }
                        .foregroundStyle(StitchColors.primary)
                        .padding(.top, 2)
                    }

                    // Metadata row (duration, alternatives)
                    metadataRow
                }
                .layoutPriority(1)
            }
            .padding(16)
        }
        .buttonStyle(.plain)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(.ultraThinMaterial)
        )
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color.white.opacity(0.75))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(Color.white.opacity(0.60), lineWidth: 1)
        )
        .shadow(color: Color.black.opacity(0.05), radius: 16, x: 0, y: 8)
    }

    private func categoryIcon(for category: String) -> String {
        switch category.lowercased() {
        case let c where c.contains("cafe") || c.contains("coffee"):
            return "cup.and.saucer.fill"
        case let c where c.contains("restaurant") || c.contains("food"):
            return "fork.knife"
        case let c where c.contains("museum") || c.contains("gallery"):
            return "building.columns.fill"
        case let c where c.contains("park") || c.contains("garden"):
            return "leaf.fill"
        case let c where c.contains("bar") || c.contains("pub"):
            return "wineglass.fill"
        case let c where c.contains("shop") || c.contains("store"):
            return "bag.fill"
        default:
            return "mappin.circle.fill"
        }
    }

    @ViewBuilder
    private var metadataRow: some View {
        if place.duration != nil || !(place.alternatives?.isEmpty ?? true) {
            HStack(spacing: 6) {
                if let duration = place.duration {
                    metadataItem(
                        icon: "clock",
                        text: String(
                            format: NSLocalizedString("itinerary.minutes", comment: "%@ min"),
                            "\(duration)"
                        )
                    )
                }

                if let alternatives = place.alternatives, !alternatives.isEmpty {
                    if place.duration != nil {
                        metadataSeparator
                    }

                    metadataItem(
                        icon: "arrow.left.arrow.right",
                        text: "+\(alternatives.count)"
                    )
                }

                Spacer(minLength: 0)
            }
            .font(.caption)
            .lineLimit(1)
        }
    }

    private var metadataSeparator: some View {
        Text("|")
            .foregroundStyle(StitchColors.onSurfaceVariant)
            .lineLimit(1)
            .fixedSize()
    }

    private func metadataItem(icon: String, text: String) -> some View {
        HStack(spacing: 3) {
            Image(systemName: icon)
                .foregroundStyle(StitchColors.primary)

            Text(text)
                .foregroundStyle(StitchColors.onSurfaceVariant)
                .lineLimit(1)
        }
        .fixedSize()
    }
}

private struct VenueCardThumbnail: View {
    let place: Itinerary.ScheduledPlace

    var body: some View {
        Group {
            if let photoUrl = place.photoUrl, let url = URL(string: photoUrl) {
                KFImage(url)
                    .placeholder { placeholder }
                    .resizable()
                    .scaledToFill()
            } else {
                placeholder
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .clipped()
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .shadow(color: Color.black.opacity(0.10), radius: 8, x: 0, y: 4)
    }

    private var placeholder: some View {
        LinearGradient(
            colors: [Color(hex: "C7EAF4"), Color(hex: "F7F9FB"), Color(hex: "F7DCE3")],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .overlay(
            Image(systemName: "fork.knife.circle.fill")
                .font(.system(size: 28))
                .foregroundStyle(Color.white.opacity(0.88))
        )
    }
}

// MARK: - Travel Time Indicator

struct TravelTimeIndicator: View {
    let travelTime: Itinerary.TravelTime?

    var body: some View {
        HStack(spacing: 6) {
            if let travel = travelTime {
                Image(systemName: modeIcon(for: travel.mode))
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(StitchColors.secondary)

                Text(travel.durationText.uppercased())
                    .font(.custom("Poppins", size: 9))
                    .fontWeight(.bold)
                    .tracking(1.8)
                    .foregroundStyle(StitchColors.secondary)
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
    @State private var showDirectionsSheet = false

    var body: some View {
        NavigationStack {
            GeometryReader { geometry in
                let topInset = geometry.safeAreaInsets.top
                let bottomInset = max(geometry.safeAreaInsets.bottom, 24)

                ZStack(alignment: .top) {
                    CrystalAuroraBackground()
                        .ignoresSafeArea()

                    ScrollView(showsIndicators: false) {
                        VStack(spacing: 60) {
                            StitchVenueHeroCard(place: place)

                            if let alternatives = place.alternatives, !alternatives.isEmpty {
                                VStack(alignment: .leading, spacing: 28) {
                                    Text(NSLocalizedString("itinerary.similar.title", comment: "Similar experiences"))
                                        .font(.custom("Manrope", size: 11))
                                        .fontWeight(.bold)
                                        .tracking(2.2)
                                        .foregroundStyle(Color.black.opacity(0.42))
                                        .padding(.horizontal, 2)

                                    VStack(spacing: 20) {
                                        ForEach(alternatives, id: \.id) { alternative in
                                            StitchAlternativeRow(alternative: alternative)
                                        }
                                    }
                                }
                                .frame(maxWidth: .infinity, alignment: .leading)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.horizontal, 24)
                        .padding(.top, topInset + 64)
                        .padding(.bottom, bottomInset + 128)
                    }

                    StitchDetailTopBar(
                        title: place.name,
                        topInset: topInset,
                        dismissAction: { dismiss() },
                        shareText: shareText
                    )
                    .padding(.horizontal, 24)

                    VStack {
                        Spacer()

                        StitchBottomActionBar(
                            canCall: place.dialURL != nil,
                            directionsAction: { showDirectionsSheet = true },
                            callAction: { callVenue() }
                        )
                        .frame(maxWidth: 400)
                        .padding(.horizontal, 20)
                        .padding(.bottom, bottomInset)
                    }
                }
                .sheet(isPresented: $showDirectionsSheet) {
                    MapsAppSheet(destination: place.directionsDestination)
                        .presentationDetents([.height(238)])
                        .presentationDragIndicator(.visible)
                        .presentationCornerRadius(30)
                }
                .toolbar(.hidden, for: .navigationBar)
            }
        }
    }

    private var shareText: String {
        [place.name, place.address, place.activityDescription]
            .compactMap { $0 }
            .joined(separator: "\n")
    }

    private func callVenue() {
        guard let url = place.dialURL else { return }
        UIApplication.shared.open(url)
    }
}

private struct StitchDetailTopBar: View {
    let title: String
    let topInset: CGFloat
    let dismissAction: () -> Void
    let shareText: String

    var body: some View {
        HStack {
            Button(action: dismissAction) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(Color(hex: "58BFE0"))
                    .frame(width: 28, height: 28)
                    .contentShape(Rectangle())
            }

            Spacer(minLength: 12)

            Text(title)
                .font(.custom("Manrope", size: 18))
                .fontWeight(.bold)
                .foregroundStyle(Color.black.opacity(0.82))
                .lineLimit(1)
                .frame(maxWidth: .infinity)

            Spacer(minLength: 12)

            ShareLink(item: shareText) {
                Image(systemName: "ellipsis")
                    .rotationEffect(.degrees(90))
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(Color(hex: "58BFE0"))
                    .frame(width: 28, height: 28)
                    .contentShape(Rectangle())
            }
        }
        .padding(.horizontal, 16)
        .frame(height: 54)
        .background(.ultraThinMaterial)
        .background(Color.white.opacity(0.74))
        .clipShape(RoundedRectangle(cornerRadius: 27, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 27, style: .continuous)
                .stroke(Color.white.opacity(0.72), lineWidth: 1)
        )
        .shadow(color: Color.black.opacity(0.06), radius: 22, x: 0, y: 12)
        .padding(.top, topInset + 8)
    }
}

private struct StitchVenueHeroCard: View {
    let place: Itinerary.ScheduledPlace

    var body: some View {
        VStack(spacing: 0) {
            StitchHeroImage(photoUrl: place.photoUrl)
                .frame(maxWidth: .infinity)
                .aspectRatio(4 / 3, contentMode: .fit)
                .overlay(alignment: .bottom) {
                    LinearGradient(
                        colors: [.clear, Color.white.opacity(0.28)],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                }
                .clipShape(RoundedRectangle(cornerRadius: 40, style: .continuous))

            VStack(alignment: .leading, spacing: 18) {
                HStack(alignment: .top, spacing: 12) {
                    VStack(alignment: .leading, spacing: 6) {
                        if let eyebrow = place.types?.first, !eyebrow.isEmpty {
                            Text(eyebrow.uppercased())
                                .font(.custom("Manrope", size: 10))
                                .fontWeight(.bold)
                                .tracking(1.8)
                                .foregroundStyle(Color(hex: "2B6775").opacity(0.62))
                        }

                        Text(place.name)
                            .font(.custom("Manrope", size: 26))
                            .fontWeight(.heavy)
                            .foregroundStyle(Color.black.opacity(0.82))
                            .lineLimit(2)
                    }

                    Spacer(minLength: 0)

                    if let rating = place.rating {
                        HStack(spacing: 4) {
                            Image(systemName: "star.fill")
                                .font(.system(size: 10, weight: .bold))
                            Text(String(format: "%.1f", rating))
                                .font(.custom("Manrope", size: 11))
                                .fontWeight(.bold)
                        }
                        .foregroundStyle(Color(hex: "2B6775"))
                        .padding(.horizontal, 9)
                        .padding(.vertical, 5)
                        .background(Color(hex: "2B6775").opacity(0.10))
                        .clipShape(Capsule())
                    }
                }

                VStack(alignment: .leading, spacing: 10) {
                    StitchInfoRow(icon: "mappin.and.ellipse", text: place.address)

                    if let statusText = place.statusText, !statusText.isEmpty {
                        StitchInfoRow(icon: "clock", text: statusText)
                    }
                }

                Text(place.activityDescription ?? NSLocalizedString("itinerary.placeholder.description", comment: "Selected venue for your itinerary."))
                    .font(.custom("Manrope", size: 12))
                    .fontWeight(.medium)
                    .foregroundStyle(Color.black.opacity(0.48))
                    .lineSpacing(3)
                    .lineLimit(4)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(24)
        }
        .background(
            RoundedRectangle(cornerRadius: 40, style: .continuous)
                .fill(.ultraThinMaterial)
        )
        .background(
            RoundedRectangle(cornerRadius: 40, style: .continuous)
                .fill(Color.white.opacity(0.70))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 40, style: .continuous)
                .strokeBorder(
                    LinearGradient(
                        colors: [Color.white.opacity(0.8), Color.white.opacity(0.22)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 1
                )
        )
        .shadow(color: Color.black.opacity(0.06), radius: 34, x: 0, y: 18)
    }
}

private struct StitchHeroImage: View {
    let photoUrl: String?

    var body: some View {
        if let photoUrl, let url = URL(string: photoUrl) {
            KFImage(url)
                .placeholder { placeholder }
                .resizable()
                .scaledToFill()
                .clipped()
        } else {
            placeholder
        }
    }

    private var placeholder: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color(hex: "D8EFF4"),
                    Color(hex: "F7F9FB"),
                    Color(hex: "F8E3E8")
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .stroke(Color.white.opacity(0.45), lineWidth: 1)
                .padding(16)

            VStack(spacing: 10) {
                Image(systemName: "fork.knife.circle.fill")
                    .font(.system(size: 40))
                    .foregroundStyle(Color.white.opacity(0.92))

                Text("LONDON")
                    .font(.custom("Manrope", size: 12))
                    .fontWeight(.bold)
                    .tracking(2.6)
                    .foregroundStyle(Color.white.opacity(0.82))
            }
        }
    }
}

private struct StitchInfoRow: View {
    let icon: String
    let text: String

    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(Color.black.opacity(0.60))
                .frame(width: 20)

            Text(text)
                .font(.custom("Manrope", size: 12))
                .fontWeight(.medium)
                .foregroundStyle(Color.black.opacity(0.54))
                .multilineTextAlignment(.leading)
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}

private struct StitchAlternativeRow: View {
    let alternative: Itinerary.AlternativePlace

    var body: some View {
        HStack(spacing: 20) {
            StitchAlternativeThumbnail(photoUrl: alternative.photoUrl)
                .frame(width: 80, height: 80)

            VStack(alignment: .leading, spacing: 4) {
                Text(alternative.name)
                    .font(.custom("Manrope", size: 15))
                    .fontWeight(.bold)
                    .foregroundStyle(Color.black.opacity(0.80))
                    .lineLimit(1)

                Text(alternative.whyRecommended ?? alternative.address)
                    .font(.custom("Manrope", size: 11))
                    .fontWeight(.medium)
                    .foregroundStyle(Color.black.opacity(0.48))
                    .lineLimit(2)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .layoutPriority(1)

            Spacer(minLength: 0)

            Image(systemName: "chevron.right")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(Color.black.opacity(0.24))
                .padding(.trailing, 6)
        }
        .frame(maxWidth: .infinity, minHeight: 112, alignment: .leading)
        .padding(16)
        .background(
            .ultraThinMaterial,
            in: RoundedRectangle(cornerRadius: 24, style: .continuous)
        )
        .background(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .fill(Color.white.opacity(0.42))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .strokeBorder(
                    LinearGradient(
                        colors: [Color.white.opacity(0.75), Color.white.opacity(0.18)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 1
                )
        )
    }
}

private struct StitchAlternativeThumbnail: View {
    let photoUrl: String?

    var body: some View {
        Group {
            if let photoUrl, let url = URL(string: photoUrl) {
                KFImage(url)
                    .placeholder { thumbnailPlaceholder }
                    .resizable()
                    .scaledToFill()
            } else {
                thumbnailPlaceholder
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    private var thumbnailPlaceholder: some View {
        LinearGradient(
            colors: [Color(hex: "F6D4DB"), Color(hex: "E2EEF3")],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .overlay(
            Image(systemName: "photo")
                .font(.system(size: 18, weight: .medium))
                .foregroundStyle(Color.white.opacity(0.85))
        )
    }
}

private struct StitchBottomActionBar: View {
    let canCall: Bool
    let directionsAction: () -> Void
    let callAction: () -> Void

    var body: some View {
        HStack(spacing: 8) {
            Button(action: directionsAction) {
                HStack(spacing: 8) {
                    Image(systemName: "paperplane.fill")
                        .font(.system(size: 13, weight: .bold))
                    Text(NSLocalizedString("itinerary.directions", comment: "Get Directions").uppercased())
                        .font(.custom("Manrope", size: 10))
                        .fontWeight(.bold)
                        .tracking(1.6)
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(
                    LinearGradient(
                        colors: [Color(hex: "47C4E1"), Color(hex: "2FA8CF")],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .clipShape(Capsule())
            }

            Button(action: callAction) {
                HStack(spacing: 8) {
                    Image(systemName: "phone.fill")
                        .font(.system(size: 13, weight: .bold))
                    Text(NSLocalizedString("itinerary.call", comment: "Call").uppercased())
                        .font(.custom("Manrope", size: 10))
                        .fontWeight(.bold)
                        .tracking(1.6)
                }
                .foregroundStyle(Color.black.opacity(canCall ? 0.58 : 0.28))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(Color.white.opacity(canCall ? 0.74 : 0.38))
                .clipShape(Capsule())
            }
            .disabled(!canCall)
        }
        .padding(8)
        .background(Color.white.opacity(0.84))
        .clipShape(Capsule())
        .overlay(
            Capsule()
                .strokeBorder(Color.white.opacity(0.72), lineWidth: 1)
        )
        .shadow(color: Color.black.opacity(0.08), radius: 28, x: 0, y: 14)
        .compositingGroup()
    }
}

private struct CrystalAuroraBackground: View {
    var body: some View {
        ZStack {
            // Base linear gradient
            LinearGradient(
                colors: [Color(hex: "F7F9FB"), Color(hex: "E3E9ED")],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            // Cyan/blue radial blob - more vivid, larger radius
            RadialGradient(
                colors: [Color(hex: "B2ECFC"), .clear],
                center: .init(x: 0.20, y: 0.30),
                startRadius: 20,
                endRadius: 400
            )

            // Pink radial blob - more vivid, larger radius
            RadialGradient(
                colors: [Color(hex: "FFD9DE"), .clear],
                center: .init(x: 0.80, y: 0.70),
                startRadius: 20,
                endRadius: 400
            )
        }
    }
}

struct MapsAppSheet: View {
    let destination: DirectionsDestination
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 18) {
            Capsule()
                .fill(Color.black.opacity(0.12))
                .frame(width: 42, height: 5)
                .padding(.top, 8)

            Text(NSLocalizedString("maps.chooseApp", comment: "Open directions in"))
                .font(.custom("Manrope", size: 18))
                .fontWeight(.bold)
                .foregroundStyle(Color.black.opacity(0.78))

            VStack(spacing: 12) {
                mapsButton(
                    title: NSLocalizedString("maps.apple", comment: "Apple Maps"),
                    systemImage: "apple.logo"
                ) {
                    open(.appleMaps)
                }

                mapsButton(
                    title: NSLocalizedString("maps.google", comment: "Google Maps"),
                    systemImage: "map.fill"
                ) {
                    open(.googleMaps)
                }
            }

            Spacer(minLength: 0)
        }
        .padding(.horizontal, 20)
        .padding(.bottom, 20)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(
            LinearGradient(
                colors: [Color.white.opacity(0.96), Color(hex: "F6F8FA")],
                startPoint: .top,
                endPoint: .bottom
            )
        )
    }

    private func mapsButton(title: String, systemImage: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Image(systemName: systemImage)
                    .font(.system(size: 15, weight: .semibold))

                Text(title)
                    .font(.custom("Manrope", size: 16))
                    .fontWeight(.bold)
            }
            .foregroundStyle(Color.black.opacity(0.76))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(Color.white.opacity(0.88))
            .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .stroke(Color.white.opacity(0.8), lineWidth: 1)
            )
        }
    }

    private func open(_ app: DirectionsAppChoice) {
        dismiss()

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
            destination.open(in: app)
        }
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
    private static let previewHeroImageURL = "https://lh3.googleusercontent.com/aida-public/AB6AXuDGQgVrweqbQ660gWRNdmOdvbuRRD8dqR5kDdvimxX-FLpw8Fc17ye1MZSbMwv907HG80ePq0F-uq83e9wrNFBjWRlckPHOme9ZWJ83dKuvAeTLBEDwyKwXzn8aBlIAQ9CgfEU9r1VSUdpLZC71epgC4eg5jGqMGOe_zGyMkXDc7yKf8H-NGemsfkQVIiYwBww1woJo39akCuKE1h_pm6yKdLYOMfcmAWIyGFvwhJQ7g3yjUGPFp4cVCvkV94Tfrqivj34AVSpmpjnf"
    private static let previewAlt1ImageURL = "https://lh3.googleusercontent.com/aida-public/AB6AXuBjpt7TF8ChyVJQ6tgtTqLrtzYPSYAW0iD386535yZ1GAYOWajJuE-zjKKEbH1E8JcuaeouQTkhYPZ6YdOVwq5Gaa52L-fFpfB18LFjaKfAdursaZRjj9XZFojluR6s82pa81sF5J0E_27xr_7qchuQxQoVlHyjGG87NIEjof_9cJR6LkIAVDmwFbYXEDxG0vnnZZctKHRYncTPpKDKnwbj0hHw5mGaB3SB1MUBmGAWr5Jl-uXxCev8B7tFqqsZy9q5QWjLo-4nFUud"
    private static let previewAlt2ImageURL = "https://lh3.googleusercontent.com/aida-public/AB6AXuDG1OTxF0_FKx5aWGR8i938uVr2sv7OHR0RKu12LZ5hdfxB84Ddk5h35H7NtHK0WHcj6U0bQxBsyABR3Z95C9woRz0Q5loNN1U5Etp6uTc2NYSJ9tdGCiEiD8HFSXp-Rn-1wcDTlO5zs1xxiHHBzVDtPQgLWITLIiTKVOCE6mce6MigKF_-XzOP3jcSCm1ika_RG3mmpaDFVlSfco_RZWA0Ez2NcxIruV3mPxbHjJLNnuCXTnoLnpNYn5oHCwVuzZB9cRxXRUHr8DTp"
    private static let previewAlt3ImageURL = "https://lh3.googleusercontent.com/aida-public/AB6AXuD7vuyvyHp8jtcskbQUDlaP-Yje6kWEbAPqsXvxqUHMgmMwgIRPGuYnfBh6WUynogRMjSWXRoHeZCPuMAqGBaa0MhCQzpoqIbK9hXkV_UPnvfeL9FryNmuSo0xSq9CFmJ3WKf_K9Rv4C_d1siTEtcK5akV8-Lts7mABkwDy6ufdbcH0ri5GXIQNGhdaV4IHFnA7DVvXMS2Tx4Ua8-oBjSC0rQFwyddLfOOJIUOKbqcpmKLSrLb90ZdGYNQByElSyH1GkvC7Qkjay7YK"

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
                activityDescription: "Enjoy artisanal coffee and pastries",
                photoUrl: previewAlt1ImageURL,
                statusText: "Open until 5:00 PM",
                isOpenNow: true,
                phoneNumber: "+44 20 0000 0000"
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
                activityDescription: "Explore world history and artifacts",
                photoUrl: previewAlt2ImageURL,
                statusText: "Open until 5:30 PM",
                isOpenNow: true,
                phoneNumber: nil
            ),
            ScheduledPlace(
                placeId: "3",
                name: "The Wolseley",
                address: "160 Piccadilly, London W1J 9EB",
                location: Place.Location(lat: 51.5079, lng: -0.1398),
                scheduledTime: "2:00 PM",
                duration: 60,
                types: ["restaurant"],
                rating: 4.8,
                alternatives: [
                    AlternativePlace(
                        placeId: "3-alt-1",
                        name: "Brasserie Zédel",
                        address: "20 Sherwood St, London W1F 7ED",
                        rating: 4.7,
                        whyRecommended: "Authentic French Brasserie • Piccadilly",
                        photoUrl: previewAlt1ImageURL
                    ),
                    AlternativePlace(
                        placeId: "3-alt-2",
                        name: "The Delaunay",
                        address: "55 Aldwych, London WC2B 4BB",
                        rating: 4.7,
                        whyRecommended: "Grand European Café • Aldwych",
                        photoUrl: previewAlt2ImageURL
                    ),
                    AlternativePlace(
                        placeId: "3-alt-3",
                        name: "Fischer's",
                        address: "50 Marylebone High St, London W1U 5HN",
                        rating: 4.6,
                        whyRecommended: "Austrian Viennese Cafe • Marylebone",
                        photoUrl: previewAlt3ImageURL
                    )
                ],
                activityDescription: "An iconic London institution set in a grand, Grade II listed building, known for its Art Deco interiors, polished service, and classic European dining from morning through late evening.",
                photoUrl: previewHeroImageURL,
                statusText: "Open until 11:00 PM",
                isOpenNow: true,
                phoneNumber: "+44 20 7499 6996"
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
