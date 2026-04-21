import SwiftUI

/// View for browsing saved trips
struct TripsView: View {
    @EnvironmentObject private var tripStore: TripStore

    var body: some View {
        ZStack {
            DesignTokens.Gradients.brandBackground
                .ignoresSafeArea()
            ScrollView(showsIndicators: false) {
                VStack(spacing: 22) {
                    headerSection

                    if tripStore.trips.isEmpty {
                        emptyState
                            .padding(.top, 8)
                    } else {
                        LazyVStack(spacing: 22) {
                            ForEach(Array(tripStore.trips.enumerated()), id: \.element.id) { index, trip in
                                tripCard(for: trip, index: index)
                            }
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 22)
                .padding(.bottom, 140)
            }
        }
        .toolbar(.hidden, for: .navigationBar)
    }

    private var headerSection: some View {
        GlassCard(variant: .frosted, cornerRadius: 38) {
            ZStack(alignment: .topTrailing) {
                Circle()
                    .fill(Color(hex: "43d0fd").opacity(0.16))
                    .frame(width: 168, height: 168)
                    .blur(radius: 20)
                    .offset(x: 52, y: -58)

                Circle()
                    .fill(Color(hex: "ffd8e7").opacity(0.22))
                    .frame(width: 132, height: 132)
                    .blur(radius: 18)
                    .offset(x: -28, y: 26)

                VStack(alignment: .leading, spacing: 18) {
                    HStack(alignment: .top) {
                        ZStack {
                            RoundedRectangle(cornerRadius: 22, style: .continuous)
                                .fill(Color.white.opacity(0.54))
                                .frame(width: 58, height: 58)

                            Image(systemName: "bookmark.fill")
                                .font(.system(size: 22, weight: .medium))
                                .foregroundStyle(Color(hex: "006783"))
                        }

                        Spacer(minLength: 16)

                        Text("\(tripStore.trips.count) SAVED")
                            .font(.custom("Manrope", size: 11))
                            .fontWeight(.semibold)
                            .tracking(1.4)
                            .foregroundStyle(Color(hex: "97406d").opacity(0.88))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(
                                Capsule()
                                    .fill(Color.white.opacity(0.52))
                            )
                            .overlay(
                                Capsule()
                                    .stroke(Color.white.opacity(0.74), lineWidth: 1)
                            )
                    }

                    Text(NSLocalizedString("trips.title", comment: "My Trips"))
                        .font(DesignTokens.Fonts.rozhaOne(size: 48))
                        .foregroundStyle(Color.black.opacity(0.88))
                }
                .padding(.horizontal, 26)
                .padding(.vertical, 24)
            }
        }
        .shadow(color: Color(hex: "006783").opacity(0.05), radius: 28, x: 0, y: 18)
    }

    @ViewBuilder
    private func tripCard(for trip: Trip, index: Int) -> some View {
        let accent = TripCardAccent(index: index)

        if let itinerary = trip.itinerarySnapshot {
            NavigationLink {
                ItineraryView(itinerary: itinerary)
            } label: {
                SavedTripCard(trip: trip, accent: accent)
            }
            .buttonStyle(.plain)
        } else {
            SavedTripCard(trip: trip, accent: accent)
        }
    }

    private var emptyState: some View {
        GlassCard(variant: .frosted, cornerRadius: 36) {
            VStack(spacing: 18) {
                ZStack {
                    RoundedRectangle(cornerRadius: 22, style: .continuous)
                        .fill(Color.white.opacity(0.52))
                        .frame(width: 74, height: 74)

                    Image(systemName: "bookmark.circle.fill")
                        .font(.system(size: 30, weight: .medium))
                        .foregroundStyle(
                            LinearGradient(
                                colors: [Color(hex: "006783"), Color(hex: "97406d")],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                }

                Text(NSLocalizedString("trips.noTrips", comment: "No trips yet"))
                    .font(DesignTokens.Fonts.rozhaOne(size: 34))
                    .foregroundStyle(DesignTokens.Colors.textPrimary)

                Text("Save an itinerary to keep the exact venues, times, and travel legs on this device.")
                    .font(.custom("Manrope", size: 16))
                    .foregroundStyle(DesignTokens.Colors.textSecondary)
                    .multilineTextAlignment(.center)
                    .lineSpacing(5)
                    .padding(.horizontal, 12)
            }
            .padding(.horizontal, 24)
            .padding(.vertical, 34)
        }
    }
}

private struct SavedTripCard: View {
    let trip: Trip
    let accent: TripCardAccent

    private var descriptor: TripCardDescriptor {
        TripCardDescriptor(trip: trip)
    }

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 38, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: [
                            Color.white.opacity(0.84),
                            accent.baseTint.opacity(0.28)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )

            RoundedRectangle(cornerRadius: 38, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: [
                            accent.primaryGlow.opacity(0.16),
                            Color.clear,
                            accent.secondaryGlow.opacity(0.16)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )

            Circle()
                .fill(accent.primaryGlow.opacity(0.22))
                .frame(width: 176, height: 176)
                .blur(radius: 26)
                .offset(x: -108, y: -104)

            Circle()
                .fill(accent.secondaryGlow.opacity(0.18))
                .frame(width: 144, height: 144)
                .blur(radius: 24)
                .offset(x: 114, y: 106)

            VStack(alignment: .leading, spacing: 24) {
                topRow

                VStack(alignment: .leading, spacing: 14) {
                    Text(descriptor.title)
                        .font(DesignTokens.Fonts.rozhaOne(size: 28))
                        .foregroundStyle(Color.black.opacity(0.86))
                        .multilineTextAlignment(.leading)
                        .lineLimit(3)

                    Text(descriptor.summary)
                        .font(.custom("Manrope", size: 16))
                        .foregroundStyle(Color.black.opacity(0.68))
                        .lineSpacing(5)
                        .lineLimit(3)
                }

                HStack(spacing: 10) {
                    ForEach(descriptor.tags, id: \.self) { tag in
                        TripTagChip(label: tag)
                    }
                }
            }
            .padding(28)
        }
        .overlay(
            RoundedRectangle(cornerRadius: 38, style: .continuous)
                .stroke(Color.white.opacity(0.78), lineWidth: 1)
        )
        .shadow(color: Color(hex: "006783").opacity(0.05), radius: 28, x: 0, y: 18)
        .frame(maxWidth: .infinity, minHeight: 272)
    }

    private var topRow: some View {
        HStack(alignment: .top) {
            ZStack {
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .fill(Color.white.opacity(0.55))
                    .frame(width: 60, height: 60)

                Image(systemName: descriptor.iconName)
                    .font(.system(size: 24, weight: .medium))
                    .foregroundStyle(descriptor.iconTint)
            }

            Spacer(minLength: 16)

            VStack(alignment: .trailing, spacing: 8) {
                Text(descriptor.dateLabel)
                    .font(.custom("Manrope", size: 13))
                    .fontWeight(.bold)
                    .tracking(2.1)
                    .foregroundStyle(Color(hex: "97406d"))

                Text(descriptor.stopLabel)
                    .font(.custom("Manrope", size: 12))
                    .fontWeight(.semibold)
                    .foregroundStyle(Color(hex: "006783").opacity(0.72))
                    .padding(.horizontal, 12)
                    .padding(.vertical, 7)
                    .background(
                        Capsule()
                            .fill(Color(hex: "43d0fd").opacity(0.07))
                    )
                    .overlay(
                        Capsule()
                            .stroke(Color(hex: "006783").opacity(0.08), lineWidth: 1)
                    )
            }
        }
    }
}

private struct TripCardAccent {
    let baseTint: Color
    let primaryGlow: Color
    let secondaryGlow: Color

    init(index: Int) {
        if index.isMultiple(of: 2) {
            baseTint = Color(hex: "eef6ff")
            primaryGlow = Color(hex: "43d0fd")
            secondaryGlow = Color(hex: "c8ecfb")
        } else {
            baseTint = Color(hex: "fff0f6")
            primaryGlow = Color(hex: "ffd8e7")
            secondaryGlow = Color(hex: "ffc0cb")
        }
    }
}

private struct TripTagChip: View {
    let label: String

    var body: some View {
        Text(label.uppercased())
            .font(.custom("Manrope", size: 10))
            .fontWeight(.bold)
            .tracking(1.5)
            .foregroundStyle(Color.black.opacity(0.58))
            .padding(.horizontal, 14)
            .padding(.vertical, 9)
            .background(
                Capsule()
                    .fill(Color.white.opacity(0.56))
            )
            .overlay(
                Capsule()
                    .stroke(Color.white.opacity(0.74), lineWidth: 1)
            )
    }
}

#Preview {
    NavigationStack {
        TripsView()
    }
    .environmentObject(TripStore())
}

private struct TripCardDescriptor {
    let trip: Trip

    var title: String {
        let rawTitle = trip.title.trimmingCharacters(in: .whitespacesAndNewlines)
        if !rawTitle.isEmpty, !isGenericDayPlanTitle(rawTitle) {
            return rawTitle
        }

        let city = trip.city.trimmingCharacters(in: .whitespacesAndNewlines)
        let themeTitle = dominantTheme.title
        return city.isEmpty ? themeTitle : "\(city): \(themeTitle)"
    }

    var summary: String {
        if let itinerary = trip.itinerarySnapshot {
            return buildSummary(from: itinerary)
        }

        if let description = trip.description?.trimmingCharacters(in: .whitespacesAndNewlines), !description.isEmpty {
            return description.replacingOccurrences(of: "\n", with: ", ")
        }

        return "An exact saved day plan ready to reopen from this device."
    }

    var tags: [String] {
        let itineraryTags = deriveTags()
        return itineraryTags.isEmpty ? [dominantTheme.fallbackTag] : Array(itineraryTags.prefix(3))
    }

    var iconName: String {
        dominantTheme.icon
    }

    var iconTint: Color {
        dominantTheme.tint
    }

    var dateLabel: String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "MMM d"
        return formatter.string(from: trip.startDate).uppercased()
    }

    var stopLabel: String {
        let count = trip.itinerarySnapshot?.places.count ?? max(trip.totalDays, 1)
        return "\(count) \(count == 1 ? "stop" : "stops")"
    }

    private var dominantTheme: TripTheme {
        let tags = deriveTags()
        if tags.contains("Dining") { return .dining }
        if tags.contains("Nature") { return .nature }
        if tags.contains("Museums") { return .museums }
        if tags.contains("Nightlife") { return .nightlife }
        if tags.contains("Coffee") { return .coffee }
        if tags.contains("Shopping") { return .shopping }
        if tags.contains("Culture") { return .culture }
        return .saved
    }

    private func isGenericDayPlanTitle(_ title: String) -> Bool {
        title.caseInsensitiveCompare("\(trip.city) Day Plan") == .orderedSame
            || title.caseInsensitiveCompare("Day Plan") == .orderedSame
    }

    private func deriveTags() -> [String] {
        guard let itinerary = trip.itinerarySnapshot else {
            return tags(from: trip.description ?? "")
        }

        var values: [String] = []

        for place in itinerary.places {
            values.append(contentsOf: place.types ?? [])
            values.append(place.activityDescription ?? "")
            values.append(place.name)
        }

        values.append(itinerary.query)
        values.append(itinerary.description ?? "")

        return tags(from: values.joined(separator: " "))
    }

    private func tags(from source: String) -> [String] {
        let normalized = source.lowercased()
        var tags: [String] = []

        func append(_ label: String, when matches: [String]) {
            guard matches.contains(where: normalized.contains), !tags.contains(label) else { return }
            tags.append(label)
        }

        append("Dining", when: ["restaurant", "dining", "dinner", "lunch", "breakfast", "brunch", "food", "oyster", "seafood", "grill", "mexican", "italian", "bistro", "cafe"])
        append("Coffee", when: ["coffee", "espresso", "tea", "roasting"])
        append("Nightlife", when: ["cocktail", "drinks", "bar", "pub", "wine", "night"])
        append("Museums", when: ["museum", "gallery", "history", "exhibit", "art"])
        append("Nature", when: ["park", "trail", "lake", "garden", "greenbelt", "nature", "walk", "stroll", "outdoor"])
        append("Shopping", when: ["shopping", "shop", "market", "boutique"])
        append("Culture", when: ["capitol", "landmark", "historic", "culture", "music", "theater", "sightseeing", "tour"])

        return tags
    }

    private func buildSummary(from itinerary: Itinerary) -> String {
        let places = itinerary.places
        guard let firstPlace = places.first else {
            return "An exact saved day plan ready to reopen from this device."
        }

        let city = trip.city.trimmingCharacters(in: .whitespacesAndNewlines)
        let firstName = shortName(for: firstPlace.name)

        guard let lastPlace = places.last, places.count > 1 else {
            switch dominantTheme {
            case .dining:
                return "A dining-led \(city) stop centered on \(firstName)."
            case .nature:
                return "A nature-focused \(city) stop built around \(firstName)."
            case .museums:
                return "A culture-forward \(city) stop centered on \(firstName)."
            default:
                return "A saved \(city) stop built around \(firstName)."
            }
        }

        let lastName = shortName(for: lastPlace.name)

        switch dominantTheme {
        case .dining:
            return "A dining-led \(city) day from \(firstName) to \(lastName)."
        case .nature:
            return "An outdoor \(city) route from \(firstName) to \(lastName)."
        case .museums:
            return "A culture-rich \(city) day from \(firstName) to \(lastName)."
        case .nightlife:
            return "A late-day \(city) plan that moves from \(firstName) to \(lastName)."
        case .coffee:
            return "A coffee-first \(city) route from \(firstName) to \(lastName)."
        case .shopping:
            return "A neighborhood shopping run from \(firstName) to \(lastName)."
        case .culture:
            return "A local-highlight \(city) plan from \(firstName) to \(lastName)."
        case .saved:
            return "An exact saved \(city) day from \(firstName) to \(lastName)."
        }
    }

    private func shortName(for value: String) -> String {
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        if let range = trimmed.range(of: " - ") {
            return String(trimmed[..<range.lowerBound])
        }
        return trimmed
    }

    private enum TripTheme {
        case dining
        case nature
        case museums
        case nightlife
        case coffee
        case shopping
        case culture
        case saved

        var title: String {
            switch self {
            case .dining: return "Dining Circuit"
            case .nature: return "Outdoor Escape"
            case .museums: return "Museum Run"
            case .nightlife: return "Night Out"
            case .coffee: return "Coffee Run"
            case .shopping: return "Shopping Edit"
            case .culture: return "City Highlights"
            case .saved: return "Saved Day"
            }
        }

        var fallbackTag: String {
            switch self {
            case .dining: return "Dining"
            case .nature: return "Nature"
            case .museums: return "Museums"
            case .nightlife: return "Nightlife"
            case .coffee: return "Coffee"
            case .shopping: return "Shopping"
            case .culture: return "Culture"
            case .saved: return "Saved"
            }
        }

        var icon: String {
            switch self {
            case .dining: return "fork.knife"
            case .nature: return "leaf.fill"
            case .museums: return "building.columns.fill"
            case .nightlife: return "wineglass.fill"
            case .coffee: return "cup.and.saucer.fill"
            case .shopping: return "bag.fill"
            case .culture: return "camera.macro"
            case .saved: return "bookmark.fill"
            }
        }

        var tint: Color {
            switch self {
            case .dining, .coffee, .shopping, .saved:
                return Color(hex: "006783")
            case .nature:
                return Color(hex: "2d8a64")
            case .museums, .nightlife, .culture:
                return Color(hex: "97406d")
            }
        }
    }
}

@MainActor
final class TripStore: ObservableObject {
    @Published private(set) var trips: [Trip] = []

    private let defaults = UserDefaults.standard
    private let storageKey = "savedTrips.v1"
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    init() {
        load()
    }

    func contains(itinerary: Itinerary) -> Bool {
        let targetFingerprint = fingerprint(for: itinerary)
        return trips.contains { trip in
            guard let snapshot = trip.itinerarySnapshot else { return false }
            return fingerprint(for: snapshot) == targetFingerprint
        }
    }

    @discardableResult
    func save(itinerary: Itinerary) -> Bool {
        guard !contains(itinerary: itinerary) else { return false }

        let nextId = (trips.map(\.id).max() ?? 0) + 1
        let trip = makeTrip(from: itinerary, id: nextId)
        trips.insert(trip, at: 0)
        persist()
        return true
    }

    private func load() {
        guard let data = defaults.data(forKey: storageKey) else {
            trips = []
            return
        }

        trips = (try? decoder.decode([Trip].self, from: data)) ?? []
        trips.sort { $0.created > $1.created }
    }

    private func persist() {
        guard let data = try? encoder.encode(trips) else { return }
        defaults.set(data, forKey: storageKey)
    }

    private func makeTrip(from itinerary: Itinerary, id: Int) -> Trip {
        let tripDate = itinerary.planDate ?? itinerary.created

        return Trip(
            id: id,
            userId: nil,
            title: displayTitle(from: itinerary),
            description: tripDescription(from: itinerary),
            city: displayCity(from: itinerary),
            startDate: tripDate,
            endDate: tripDate,
            totalDays: 1,
            accommodations: nil,
            created: Date(),
            itinerarySnapshot: itinerary
        )
    }

    private func displayTitle(from itinerary: Itinerary) -> String {
        let trimmedTitle = itinerary.title?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        if !trimmedTitle.isEmpty {
            return trimmedTitle
        }

        return "\(displayCity(from: itinerary)) Day Plan"
    }

    private func displayCity(from itinerary: Itinerary) -> String {
        let trimmedCity = itinerary.city?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        if !trimmedCity.isEmpty {
            return trimmedCity
        }

        return "London"
    }

    private func tripDescription(from itinerary: Itinerary) -> String? {
        let trimmedDescription = itinerary.description?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        if !trimmedDescription.isEmpty {
            return trimmedDescription
        }

        let trimmedQuery = itinerary.query.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmedQuery.isEmpty {
            return trimmedQuery
        }

        let placeSummary = itinerary.places.prefix(3).map(\.name).joined(separator: " • ")
        return placeSummary.isEmpty ? nil : placeSummary
    }

    private func fingerprint(for itinerary: Itinerary) -> String {
        let dayValue = itinerary.planDate.map { Calendar.current.startOfDay(for: $0).timeIntervalSince1970 } ?? 0

        let places = itinerary.places.map { place in
            [
                place.placeId ?? "",
                place.name,
                place.address,
                place.scheduledTime,
                String(place.duration ?? 0),
                String(place.location.lat),
                String(place.location.lng)
            ].joined(separator: "|")
        }

        let travel = (itinerary.travelTimes ?? []).map { leg in
            [
                leg.from,
                leg.to,
                String(leg.durationMinutes),
                leg.durationText,
                leg.mode?.rawValue ?? ""
            ].joined(separator: "|")
        }

        return [
            itinerary.city ?? "",
            String(dayValue),
            itinerary.query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased(),
            places.joined(separator: "||"),
            travel.joined(separator: "||")
        ].joined(separator: "###")
    }
}
