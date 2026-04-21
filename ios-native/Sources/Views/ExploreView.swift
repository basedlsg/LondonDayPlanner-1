import SwiftUI
import Kingfisher

// MARK: - SF Symbol Mapping for Collection Icons

private enum CollectionIconMapper {
    static func sfSymbol(for materialIcon: String) -> String {
        switch materialIcon {
        case "sports_bar": return "mug.fill"
        case "explore": return "safari.fill"
        case "park": return "leaf.fill"
        case "coffee": return "cup.and.saucer.fill"
        case "wb_twilight": return "sunset.fill"
        case "restaurant": return "fork.knife"
        case "favorite": return "heart.fill"
        case "castle": return "building.columns.fill"
        case "stadium": return "sportscourt.fill"
        case "brunch_dining": return "fork.knife.circle.fill"
        case "nightlife": return "moon.stars.fill"
        case "roofing": return "building.2.fill"
        case "ramen_dining": return "takeoutbag.and.cup.and.straw.fill"
        case "museum": return "building.columns.fill"
        case "music_note": return "music.note"
        case "lunch_dining": return "fork.knife"
        case "palette": return "paintpalette.fill"
        case "kayaking": return "figure.rowing"
        default:
            // If it already looks like an SF Symbol name, return as-is
            if materialIcon.contains(".") || materialIcon.contains("_") == false {
                return materialIcon
            }
            return "map.fill"
        }
    }
}

// MARK: - ExploreView (Crystal Clarity Style)

/// Explore cities and discover curated collections
struct ExploreView: View {
    @EnvironmentObject var cityManager: CityManager
    @StateObject private var viewModel = ExploreViewModel()

    var body: some View {
        ZStack {
            // Unified brand background
            DesignTokens.Gradients.brandBackground
                .ignoresSafeArea()

            GeometryReader { geo in
                ScrollView(.vertical, showsIndicators: false) {
                    VStack(spacing: 0) {
                        // 1. Hero Section
                        heroSection
                            .frame(width: geo.size.width)

                        // 2. City Selector (horizontal scroll)
                        citySelectorStrip
                            .padding(.top, DesignTokens.Spacing.md)

                        // 3. Weather / Time Cards
                        weatherTimeCards
                            .padding(.top, DesignTokens.Spacing.md)
                            .padding(.horizontal, 20)

                        // 4. Curated Collections
                        collectionsSection
                            .padding(.top, DesignTokens.Spacing.lg)
                            .padding(.horizontal, 20)

                        Spacer(minLength: 140)
                    }
                    .frame(width: geo.size.width)
                }
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .task(id: cityManager.currentCity?.slug) {
            await viewModel.loadCollections(for: cityManager.currentCity)
        }
    }

    // MARK: - Hero Section

    private var heroSection: some View {
        // Use Color.clear + .background to avoid .fill expanding the layout
        Color.clear
            .frame(height: 280)
            .background(
                Image(cityManager.currentCity?.imageName ?? "city_default")
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            )
            .clipped()
            .overlay(
                LinearGradient(
                    colors: [
                        Color.black.opacity(0.0),
                        Color.black.opacity(0.15),
                        Color.black.opacity(0.55)
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
            .overlay(alignment: .bottomLeading) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(cityManager.currentCity?.name ?? "Explore")
                        .font(DesignTokens.Fonts.rozhaOne(size: 42))
                        .foregroundStyle(.white)
                        .shadow(color: .black.opacity(0.3), radius: 8, x: 0, y: 4)

                    Text("Curated routes & hidden gems")
                        .font(DesignTokens.Fonts.inter(size: 15, weight: .medium))
                        .foregroundStyle(.white.opacity(0.9))
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 28)
            }
    }

    // MARK: - City Selector Strip

    // Only show these 5 cities on Explore
    private let exploreCitySlugs = ["london", "nyc", "boston", "austin", "paris"]

    private var exploreCities: [City] {
        let ordered = exploreCitySlugs.compactMap { slug in
            cityManager.cities.first(where: { $0.slug == slug })
        }
        return ordered
    }

    private var citySelectorStrip: some View {
        ScrollViewReader { proxy in
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 16) {
                    ForEach(exploreCities) { city in
                        Button {
                            withAnimation(.easeInOut(duration: 0.3)) {
                                cityManager.selectCity(city)
                            }
                        } label: {
                            VStack(spacing: 6) {
                                Image(city.imageName)
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                                    .frame(width: 64, height: 64)
                                    .clipShape(Circle())
                                    .overlay(
                                        Circle()
                                            .stroke(
                                                city.slug == cityManager.currentCity?.slug
                                                    ? DesignTokens.Colors.stitchPrimary
                                                    : Color.white.opacity(0.6),
                                                lineWidth: city.slug == cityManager.currentCity?.slug ? 3 : 1.5
                                            )
                                    )
                                    .shadow(color: Color.black.opacity(0.06), radius: 8, x: 0, y: 4)

                                Text(city.name)
                                    .font(DesignTokens.Fonts.jakartaSans(size: 11, weight: .semibold))
                                    .foregroundStyle(
                                        city.slug == cityManager.currentCity?.slug
                                            ? DesignTokens.Colors.stitchPrimary
                                            : DesignTokens.Colors.textSecondary
                                    )
                                    .lineLimit(1)
                                    .fixedSize()
                            }
                            .frame(width: 76)
                        }
                        .id(city.slug)
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 24)
            }
            .onChange(of: cityManager.currentCity?.slug) { _, newSlug in
                if let slug = newSlug {
                    withAnimation {
                        proxy.scrollTo(slug, anchor: .center)
                    }
                }
            }
        }
    }

    // MARK: - Weather / Time Cards

    private var weatherTimeCards: some View {
        HStack(spacing: 14) {
            // Temperature card
            glassInfoCard(
                icon: "thermometer.medium",
                label: "Temperature",
                value: viewModel.temperatureText
            )

            // Local time card
            glassInfoCard(
                icon: "clock.fill",
                label: "Local Time",
                value: viewModel.localTimeText(for: cityManager.currentCity)
            )
        }
    }

    private func glassInfoCard(icon: String, label: String, value: String) -> some View {
        HStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(Color.white.opacity(0.54))
                    .frame(width: 42, height: 42)

                Image(systemName: icon)
                    .font(.system(size: 18, weight: .medium))
                    .foregroundStyle(DesignTokens.Colors.stitchPrimary)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(label.uppercased())
                    .font(DesignTokens.Fonts.jakartaSans(size: 9, weight: .bold))
                    .tracking(1.0)
                    .foregroundStyle(DesignTokens.Colors.textSecondary)
                    .lineLimit(1)
                    .fixedSize()

                Text(value)
                    .font(DesignTokens.Fonts.rozhaOne(size: 20))
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
                    .lineLimit(1)
                    .fixedSize()
            }

            Spacer()
        }
        .padding(16)
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
        .shadow(color: DesignTokens.Colors.stitchPrimary.opacity(0.06), radius: 20, x: 0, y: 10)
    }

    // MARK: - Collections Section

    private var collectionsSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            Text("Curated Collections")
                .font(DesignTokens.Fonts.rozhaOne(size: 30))
                .foregroundStyle(DesignTokens.Colors.textPrimary)

            if viewModel.isLoading {
                VStack(spacing: 16) {
                    ProgressView()
                        .tint(DesignTokens.Colors.stitchPrimary)
                    Text("Loading collections...")
                        .font(DesignTokens.Fonts.inter(size: 14))
                        .foregroundStyle(DesignTokens.Colors.textSecondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 40)
            } else if viewModel.collections.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "map.fill")
                        .font(.system(size: 36))
                        .foregroundStyle(DesignTokens.Colors.stitchPrimary.opacity(0.4))
                    Text("No collections available yet")
                        .font(DesignTokens.Fonts.inter(size: 15))
                        .foregroundStyle(DesignTokens.Colors.textSecondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 40)
            } else {
                LazyVStack(spacing: 18) {
                    ForEach(viewModel.collections) { collection in
                        NavigationLink {
                            CollectionDetailView(
                                collection: collection,
                                citySlug: cityManager.currentCity?.slug ?? "london"
                            )
                            .environmentObject(cityManager)
                        } label: {
                            CollectionCard(collection: collection)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }
}

// MARK: - Collection Card

private struct CollectionCard: View {
    let collection: CollectionMeta

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Top row: Icon + Stop count
            HStack(alignment: .top) {
                ZStack {
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .fill(
                            LinearGradient(
                                colors: [
                                    DesignTokens.Colors.stitchPrimary.opacity(0.12),
                                    DesignTokens.Colors.stitchPrimary.opacity(0.06)
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 52, height: 52)

                    Image(systemName: CollectionIconMapper.sfSymbol(for: collection.icon))
                        .font(.system(size: 22, weight: .medium))
                        .foregroundStyle(DesignTokens.Colors.stitchPrimary)
                }

                Spacer()

                // Stop count badge
                Text("\(collection.stops) STOPS")
                    .font(DesignTokens.Fonts.jakartaSans(size: 10, weight: .bold))
                    .tracking(1.4)
                    .foregroundStyle(DesignTokens.Colors.stitchSecondary.opacity(0.88))
                    .padding(.horizontal, 12)
                    .padding(.vertical, 7)
                    .background(
                        Capsule()
                            .fill(Color.white.opacity(0.52))
                    )
                    .overlay(
                        Capsule()
                            .stroke(Color.white.opacity(0.74), lineWidth: 1)
                    )
            }

            // Title
            Text(collection.title)
                .font(DesignTokens.Fonts.rozhaOne(size: 24))
                .foregroundStyle(Color.black.opacity(0.88))
                .multilineTextAlignment(.leading)
                .lineLimit(2)

            // Description
            Text(collection.description)
                .font(DesignTokens.Fonts.inter(size: 14, weight: .regular))
                .foregroundStyle(DesignTokens.Colors.textSecondary)
                .lineSpacing(4)
                .lineLimit(3)

            // Tag chips
            if !collection.tags.isEmpty {
                tagChips
            }

            // Explore Route arrow
            HStack {
                Spacer()
                HStack(spacing: 6) {
                    Text("Explore Route")
                        .font(DesignTokens.Fonts.poppins(size: 14, weight: .semibold))
                        .foregroundStyle(DesignTokens.Colors.stitchPrimary)
                    Image(systemName: "arrow.right")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(DesignTokens.Colors.stitchPrimary)
                }
            }
        }
        .padding(24)
        .background(
            ZStack {
                Rectangle().fill(Material.thickMaterial)
                    .environment(\.colorScheme, .light)
                Rectangle().fill(Color.white.opacity(0.40))
            }
        )
        .clipShape(RoundedRectangle(cornerRadius: 40, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 40, style: .continuous)
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
        .shadow(color: DesignTokens.Colors.stitchPrimary.opacity(0.05), radius: 28, x: 0, y: 18)
    }

    private var tagChips: some View {
        FlowLayout(spacing: 8) {
            ForEach(collection.tags.prefix(4), id: \.self) { tag in
                Text(tag.uppercased())
                    .font(DesignTokens.Fonts.jakartaSans(size: 10, weight: .bold))
                    .tracking(1.2)
                    .foregroundStyle(Color.black.opacity(0.55))
                    .padding(.horizontal, 12)
                    .padding(.vertical, 7)
                    .background(
                        Capsule()
                            .fill(Color.white.opacity(0.52))
                    )
                    .overlay(
                        Capsule()
                            .stroke(Color.white.opacity(0.68), lineWidth: 1)
                    )
            }
        }
    }
}

// MARK: - Flow Layout (for tag chips)

private struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = flowLayout(proposal: proposal, subviews: subviews)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = flowLayout(proposal: proposal, subviews: subviews)
        for (index, position) in result.positions.enumerated() {
            subviews[index].place(
                at: CGPoint(x: bounds.minX + position.x, y: bounds.minY + position.y),
                proposal: .unspecified
            )
        }
    }

    private func flowLayout(proposal: ProposedViewSize, subviews: Subviews) -> (size: CGSize, positions: [CGPoint]) {
        let maxWidth = proposal.width ?? .infinity
        var positions: [CGPoint] = []
        var currentX: CGFloat = 0
        var currentY: CGFloat = 0
        var lineHeight: CGFloat = 0
        var totalWidth: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if currentX + size.width > maxWidth, currentX > 0 {
                currentX = 0
                currentY += lineHeight + spacing
                lineHeight = 0
            }
            positions.append(CGPoint(x: currentX, y: currentY))
            lineHeight = max(lineHeight, size.height)
            currentX += size.width + spacing
            totalWidth = max(totalWidth, currentX - spacing)
        }

        return (CGSize(width: totalWidth, height: currentY + lineHeight), positions)
    }
}

// MARK: - ExploreViewModel

@MainActor
final class ExploreViewModel: ObservableObject {
    @Published var collections: [CollectionMeta] = []
    @Published var isLoading = false
    @Published var error: String?
    @Published var temperatureText: String = "—"

    private let apiClient = APIClient.shared

    // City coordinates now come from the City model's defaultCenter

    func localTimeText(for city: City?) -> String {
        guard let city = city else { return "--:--" }
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        formatter.timeZone = TimeZone(identifier: city.timezone)
        return formatter.string(from: Date())
    }

    func loadCollections(for city: City?) async {
        guard let city = city else { return }
        isLoading = true
        error = nil

        // Fetch collections and weather in parallel
        async let collectionsTask: () = fetchCollections(for: city)
        async let weatherTask: () = fetchWeather(for: city)
        _ = await (collectionsTask, weatherTask)

        isLoading = false
    }

    private func fetchCollections(for city: City) async {
        do {
            collections = try await apiClient.getCollections(citySlug: city.slug)
            collections = collections.map { meta in
                CollectionMeta(
                    slug: meta.slug,
                    title: meta.title,
                    description: meta.description,
                    icon: CollectionIconMapper.sfSymbol(for: meta.icon),
                    tags: meta.tags,
                    stops: meta.stops
                )
            }
        } catch {
            self.error = error.localizedDescription
            collections = []
        }
    }

    private func fetchWeather(for city: City) async {
        let lat = city.defaultCenter.lat
        let lon = city.defaultCenter.lng
        let urlString = "https://api.open-meteo.com/v1/forecast?latitude=\(lat)&longitude=\(lon)&current=temperature_2m&temperature_unit=celsius"
        guard let url = URL(string: urlString) else { return }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
               let current = json["current"] as? [String: Any],
               let temp = current["temperature_2m"] as? Double {
                temperatureText = "\(Int(temp))°C"
            }
        } catch {
            temperatureText = "—"
        }
    }
}

// MARK: - Previews

#Preview {
    NavigationStack {
        ExploreView()
    }
    .environmentObject(CityManager())
}
