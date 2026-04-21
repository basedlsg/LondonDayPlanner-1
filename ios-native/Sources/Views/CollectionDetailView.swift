import SwiftUI
import Kingfisher

// MARK: - CollectionDetailView (Refined Logistics Style)

struct CollectionDetailView: View {
    let collection: CollectionMeta
    let citySlug: String

    @EnvironmentObject var cityManager: CityManager
    @StateObject private var viewModel = CollectionDetailViewModel()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            // Unified brand background
            DesignTokens.Gradients.brandBackground
                .ignoresSafeArea()

            if viewModel.isLoading {
                loadingState
            } else if let itinerary = viewModel.itinerary {
                itineraryContent(itinerary)
            } else if let error = viewModel.error {
                errorState(error)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    Task {
                        await viewModel.generate(citySlug: citySlug, collectionSlug: collection.slug)
                    }
                } label: {
                    Label("Shuffle", systemImage: "shuffle")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(DesignTokens.Colors.stitchPrimary)
                }
                .disabled(viewModel.isLoading)
            }
        }
        .task {
            if viewModel.itinerary == nil && !viewModel.isLoading {
                await viewModel.loadOrGenerate(citySlug: citySlug, collectionSlug: collection.slug)
            }
        }
    }

    // MARK: - Loading State

    private var loadingState: some View {
        VStack(spacing: 24) {
            ProgressView()
                .scaleEffect(1.2)
                .tint(DesignTokens.Colors.stitchPrimary)

            VStack(spacing: 8) {
                Text("Generating your route...")
                    .font(DesignTokens.Fonts.rozhaOne(size: 22))
                    .foregroundStyle(DesignTokens.Colors.textPrimary)

                Text("Curating the best stops for \(collection.title)")
                    .font(DesignTokens.Fonts.inter(size: 14))
                    .foregroundStyle(DesignTokens.Colors.textSecondary)
                    .multilineTextAlignment(.center)
            }
        }
        .padding(40)
    }

    // MARK: - Error State

    private func errorState(_ message: String) -> some View {
        VStack(spacing: 20) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 40))
                .foregroundStyle(DesignTokens.Colors.stitchSecondary.opacity(0.6))

            Text("Could not load collection")
                .font(DesignTokens.Fonts.rozhaOne(size: 22))
                .foregroundStyle(DesignTokens.Colors.textPrimary)

            Text(message)
                .font(DesignTokens.Fonts.inter(size: 14))
                .foregroundStyle(DesignTokens.Colors.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)

            Button {
                Task {
                    await viewModel.generate(citySlug: citySlug, collectionSlug: collection.slug)
                }
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "arrow.clockwise")
                    Text("Retry")
                }
                .font(DesignTokens.Fonts.poppins(size: 15, weight: .semibold))
                .foregroundStyle(.white)
                .padding(.horizontal, 28)
                .padding(.vertical, 14)
                .background(DesignTokens.Colors.stitchPrimary)
                .clipShape(Capsule())
            }
        }
        .padding(40)
    }

    // MARK: - Itinerary Content

    private func itineraryContent(_ itinerary: Itinerary) -> some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: 0) {
                // Header
                headerSection

                // Timeline
                timelineSection(itinerary)
                    .padding(.top, DesignTokens.Spacing.lg)

                // Trip Logistics
                logisticsSection(itinerary)
                    .padding(.top, DesignTokens.Spacing.lg)

                // Pro-tip
                if let description = itinerary.description, !description.isEmpty {
                    proTipSection(description)
                        .padding(.top, DesignTokens.Spacing.md)
                }

                // Save button
                saveButton(itinerary)
                    .padding(.top, DesignTokens.Spacing.lg)

                Spacer(minLength: 140)
            }
            .padding(.horizontal, 20)
            .padding(.top, 20)
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(collection.title)
                .font(DesignTokens.Fonts.rozhaOne(size: 38))
                .foregroundStyle(Color.black.opacity(0.88))

            Text(collection.description)
                .font(DesignTokens.Fonts.inter(size: 15, weight: .regular))
                .foregroundStyle(DesignTokens.Colors.textSecondary)
                .lineSpacing(5)
        }
    }

    // MARK: - Timeline Section

    private func timelineSection(_ itinerary: Itinerary) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(Array(itinerary.places.enumerated()), id: \.element.id) { index, place in
                timelineStop(place: place, index: index, isLast: index == itinerary.places.count - 1)
            }
        }
    }

    private func timelineStop(place: Itinerary.ScheduledPlace, index: Int, isLast: Bool) -> some View {
        HStack(alignment: .top, spacing: 16) {
            // Timeline line + dot
            VStack(spacing: 0) {
                Circle()
                    .fill(DesignTokens.Colors.stitchPrimary)
                    .frame(width: 12, height: 12)
                    .padding(.top, 6)

                if !isLast {
                    Rectangle()
                        .fill(DesignTokens.Colors.stitchPrimary.opacity(0.2))
                        .frame(width: 2)
                        .frame(maxHeight: .infinity)
                }
            }
            .frame(width: 12)

            // Venue card
            VStack(alignment: .leading, spacing: 12) {
                // Time badge
                Text(place.scheduledTime)
                    .font(DesignTokens.Fonts.jakartaSans(size: 11, weight: .bold))
                    .tracking(1.2)
                    .foregroundStyle(DesignTokens.Colors.stitchPrimary)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(
                        Capsule()
                            .fill(DesignTokens.Colors.stitchPrimary.opacity(0.08))
                    )

                // Photo
                if let photoUrl = place.photoUrl,
                   let url = URL(string: photoUrl.hasPrefix("/") ? "https://london-day-planner-1.vercel.app\(photoUrl)" : photoUrl) {
                    KFImage(url)
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(maxWidth: .infinity)
                        .frame(height: 160)
                        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                }

                // Venue name
                Text(place.name)
                    .font(DesignTokens.Fonts.rozhaOne(size: 22))
                    .foregroundStyle(Color.black.opacity(0.88))
                    .lineLimit(2)

                // Category tags
                if let types = place.types, !types.isEmpty {
                    HStack(spacing: 6) {
                        ForEach(types.prefix(3), id: \.self) { type in
                            Text(type.capitalized)
                                .font(DesignTokens.Fonts.jakartaSans(size: 9, weight: .bold))
                                .tracking(0.8)
                                .foregroundStyle(DesignTokens.Colors.stitchSecondary.opacity(0.8))
                                .padding(.horizontal, 10)
                                .padding(.vertical, 5)
                                .background(
                                    Capsule()
                                        .fill(DesignTokens.Colors.stitchSecondary.opacity(0.06))
                                )
                        }
                    }
                }

                // Description
                if let desc = place.activityDescription, !desc.isEmpty {
                    Text(desc)
                        .font(DesignTokens.Fonts.inter(size: 14, weight: .regular))
                        .foregroundStyle(DesignTokens.Colors.textSecondary)
                        .lineSpacing(4)
                        .lineLimit(3)
                }
            }
            .padding(20)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                ZStack {
                    Rectangle().fill(Material.thickMaterial)
                        .environment(\.colorScheme, .light)
                    Rectangle().fill(Color.white.opacity(0.40))
                }
            )
            .clipShape(RoundedRectangle(cornerRadius: 28, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 28, style: .continuous)
                    .strokeBorder(
                        LinearGradient(
                            colors: [Color.white.opacity(0.8), Color.white.opacity(0.2)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 1
                    )
                    .blendMode(.overlay)
            )
            .shadow(color: DesignTokens.Colors.stitchPrimary.opacity(0.04), radius: 20, x: 0, y: 10)
            .padding(.bottom, isLast ? 0 : 8)
        }
    }

    // MARK: - Logistics Section

    private func logisticsSection(_ itinerary: Itinerary) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Trip Logistics")
                .font(DesignTokens.Fonts.rozhaOne(size: 24))
                .foregroundStyle(DesignTokens.Colors.textPrimary)

            HStack(spacing: 12) {
                logisticsCard(
                    icon: "figure.walk",
                    label: "Distance",
                    value: estimatedDistance(itinerary)
                )
                logisticsCard(
                    icon: "tram.fill",
                    label: "Transport",
                    value: dominantTransport(itinerary)
                )
                logisticsCard(
                    icon: "sterlingsign.circle.fill",
                    label: "Budget",
                    value: "Free - $$"
                )
            }
        }
    }

    private func logisticsCard(icon: String, label: String, value: String) -> some View {
        VStack(spacing: 10) {
            Image(systemName: icon)
                .font(.system(size: 22, weight: .medium))
                .foregroundStyle(DesignTokens.Colors.stitchPrimary)

            Text(label.uppercased())
                .font(DesignTokens.Fonts.jakartaSans(size: 9, weight: .bold))
                .tracking(1)
                .foregroundStyle(DesignTokens.Colors.textSecondary)

            Text(value)
                .font(DesignTokens.Fonts.inter(size: 13, weight: .semibold))
                .foregroundStyle(DesignTokens.Colors.textPrimary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 18)
        .background(
            ZStack {
                Rectangle().fill(Material.thickMaterial)
                    .environment(\.colorScheme, .light)
                Rectangle().fill(Color.white.opacity(0.40))
            }
        )
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .strokeBorder(
                    LinearGradient(
                        colors: [Color.white.opacity(0.8), Color.white.opacity(0.2)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 1
                )
                .blendMode(.overlay)
        )
        .shadow(color: DesignTokens.Colors.stitchPrimary.opacity(0.04), radius: 16, x: 0, y: 8)
    }

    // MARK: - Pro-tip Section

    private func proTipSection(_ tip: String) -> some View {
        HStack(spacing: 14) {
            // Left accent bar
            RoundedRectangle(cornerRadius: 2)
                .fill(DesignTokens.Colors.stitchPrimary)
                .frame(width: 4)

            VStack(alignment: .leading, spacing: 6) {
                Text("PRO TIP")
                    .font(DesignTokens.Fonts.jakartaSans(size: 10, weight: .bold))
                    .tracking(1.4)
                    .foregroundStyle(DesignTokens.Colors.stitchPrimary)

                Text(tip)
                    .font(DesignTokens.Fonts.inter(size: 14, weight: .regular))
                    .foregroundStyle(DesignTokens.Colors.textSecondary)
                    .lineSpacing(4)
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            ZStack {
                Rectangle().fill(Material.thickMaterial)
                    .environment(\.colorScheme, .light)
                Rectangle().fill(Color.white.opacity(0.40))
            }
        )
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
    }

    // MARK: - Save Button

    @EnvironmentObject private var tripStore: TripStore

    private func saveButton(_ itinerary: Itinerary) -> some View {
        let isSaved = tripStore.contains(itinerary: itinerary)

        return Button {
            if !isSaved {
                tripStore.save(itinerary: itinerary)
            }
        } label: {
            HStack(spacing: 10) {
                Image(systemName: isSaved ? "checkmark.circle.fill" : "bookmark.fill")
                    .font(.system(size: 16, weight: .semibold))
                Text(isSaved ? "Saved to Trips" : "Save to Trips")
                    .font(DesignTokens.Fonts.poppins(size: 16, weight: .semibold))
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(
                Capsule()
                    .fill(isSaved ? Color.green : DesignTokens.Colors.stitchPrimary)
            )
            .shadow(color: DesignTokens.Colors.stitchPrimary.opacity(0.2), radius: 16, x: 0, y: 8)
        }
        .disabled(isSaved)
    }

    // MARK: - Helpers

    private func estimatedDistance(_ itinerary: Itinerary) -> String {
        guard let travelTimes = itinerary.travelTimes, !travelTimes.isEmpty else {
            return "~3 km"
        }
        let totalMinutes = travelTimes.reduce(0) { $0 + $1.durationMinutes }
        // Rough estimate: 5 km/h walking pace
        let km = Double(totalMinutes) * 5.0 / 60.0
        return String(format: "~%.1f km", km)
    }

    private func dominantTransport(_ itinerary: Itinerary) -> String {
        guard let travelTimes = itinerary.travelTimes, !travelTimes.isEmpty else {
            return "Walking"
        }
        let modes = travelTimes.compactMap { $0.mode }
        let walkingCount = modes.filter { $0 == .walking }.count
        let transitCount = modes.filter { $0 == .transit }.count
        if transitCount > walkingCount {
            return "Transit"
        }
        return "Walking"
    }
}

// MARK: - CollectionDetailViewModel

@MainActor
final class CollectionDetailViewModel: ObservableObject {
    @Published var itinerary: Itinerary?
    @Published var isLoading = false
    @Published var error: String?
    @Published var isFromSeed = false

    private let apiClient = APIClient.shared

    // Static cache: persists across navigation (city+slug → itinerary)
    private static var cache: [String: Itinerary] = [:]

    // Seed itineraries loaded from the app bundle
    private static let seedItineraries: [String: Itinerary] = {
        guard let url = Bundle.main.url(forResource: "SeedItineraries", withExtension: "json"),
              let data = try? Data(contentsOf: url) else {
            return [:]
        }
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return (try? decoder.decode([String: Itinerary].self, from: data)) ?? [:]
    }()

    private static func cacheKey(_ citySlug: String, _ collectionSlug: String) -> String {
        "\(citySlug)/\(collectionSlug)"
    }

    /// Load from cache first, then seed data. No API call on first load.
    func loadOrGenerate(citySlug: String, collectionSlug: String) async {
        let key = Self.cacheKey(citySlug, collectionSlug)

        // 1. Check in-memory cache (from a previous shuffle)
        if let cached = Self.cache[key] {
            itinerary = cached
            isFromSeed = false
            return
        }

        // 2. Load from seed data (instant, no API cost)
        if let seed = Self.seedItineraries[key] {
            itinerary = seed
            isFromSeed = true
            return
        }

        // 3. Fallback: generate via API if no seed exists
        await generate(citySlug: citySlug, collectionSlug: collectionSlug)
    }

    /// Force a fresh AI generation (shuffle button)
    func generate(citySlug: String, collectionSlug: String) async {
        isLoading = true
        error = nil
        itinerary = nil

        do {
            let result = try await apiClient.generateCollection(citySlug: citySlug, slug: collectionSlug)
            let key = Self.cacheKey(citySlug, collectionSlug)
            Self.cache[key] = result
            itinerary = result
            isFromSeed = false
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        CollectionDetailView(
            collection: CollectionMeta(
                slug: "historic-pubs",
                title: "Historic Pub Crawl",
                description: "Trace centuries of London history through its most storied pubs.",
                icon: "mug.fill",
                tags: ["Pubs", "History"],
                stops: 4
            ),
            citySlug: "london"
        )
    }
    .environmentObject(CityManager())
    .environmentObject(TripStore())
}
