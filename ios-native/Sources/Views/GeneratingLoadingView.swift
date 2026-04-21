import SwiftUI

/// Full-screen loading view shown during itinerary generation
/// Matches the pink "PLAN" loading screen design from Loading_Screens mockups
struct GeneratingLoadingView: View {
    let citySlug: String?
    let cityName: String?

    @State private var progress: CGFloat = 0.0
    @State private var currentFact: CityFact?

    // Show one fact for the whole loading duration (no rotation).

    private var resolvedCity: CityKey {
        CityKey.resolve(slug: citySlug, name: cityName)
    }

    var body: some View {
        loadingScreen
            .ignoresSafeArea()
            .onAppear {
                currentFact = randomFact()
                startProgressAnimation()
            }
    }

    private var loadingScreen: some View {
        ZStack {
            // 1. Solid pink gradient background (standardized)
            pinkGradient
                .ignoresSafeArea()

            // 2. Large illustration as subtle background overlay
            illustrationSection
                .opacity(0.35)
                .ignoresSafeArea()

            // 3. Text content on top
            VStack(spacing: 0) {
                Spacer()
                    .frame(height: 80)

                Text("PLAN")
                    .font(DesignTokens.Fonts.rozhaOne(size: 80))
                    .foregroundStyle(.white)

                progressBar
                    .padding(.horizontal, 50)
                    .padding(.top, 20)

                Spacer()

                triviaSection
                    .padding(.bottom, 60)
            }
        }
    }

    // MARK: - Progress Bar

    private var progressBar: some View {
        ZStack(alignment: .leading) {
            RoundedRectangle(cornerRadius: 6)
                .fill(.white.opacity(0.3))
                .frame(height: 12)

            GeometryReader { geo in
                RoundedRectangle(cornerRadius: 6)
                    .fill(blueBarGradient)
                    .frame(width: geo.size.width * progress, height: 12)
            }
            .frame(height: 12)
        }
    }

    // MARK: - Illustration

    @ViewBuilder
    private var illustrationSection: some View {
        if let assetName = currentFact?.image, !assetName.isEmpty {
            Image(assetName)
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .padding(.horizontal, 20)
        } else {
            Color.clear
        }
    }

    // MARK: - Trivia

    private var triviaSection: some View {
        VStack(spacing: 12) {
            Text(NSLocalizedString("loading.didYouKnow", comment: "Loading screen heading"))
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(.white.opacity(0.85))
                .tracking(1)

            Text(currentFact?.text ?? NSLocalizedString("loading.fact.general.1", comment: ""))
                .font(DesignTokens.Fonts.rozhaOne(size: 16))
                .foregroundStyle(.white)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 36)
        }
    }

    // MARK: - Gradients

    private var pinkGradient: LinearGradient {
        LinearGradient(
            colors: [Color(hex: "E8879B"), Color(hex: "EA8FA2"), Color(hex: "F0A0B0")],
            startPoint: .top,
            endPoint: .bottom
        )
    }

    private var blueBarGradient: LinearGradient {
        LinearGradient(
            colors: [Color(hex: "4A9FD9"), Color(hex: "5BB5E8")],
            startPoint: .leading,
            endPoint: .trailing
        )
    }

    // MARK: - Animations

    private func startProgressAnimation() {
        progress = 0
        withAnimation(.easeInOut(duration: 8)) {
            progress = 0.6
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 8) {
            withAnimation(.easeInOut(duration: 12)) {
                progress = 0.85
            }
        }
    }

    private func randomFact() -> CityFact {
        let facts = cityFacts[resolvedCity] ?? generalFacts
        return facts.randomElement() ?? generalFacts[0]
    }

    // MARK: - City Key Resolution

    enum CityKey: String {
        case london, nyc, boston, austin, paris, general

        static func resolve(slug: String?, name: String?) -> CityKey {
            let normalizedSlug = slug?.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
            switch normalizedSlug {
            case "london":
                return .london
            case "nyc", "new-york", "new_york", "newyork":
                return .nyc
            case "boston":
                return .boston
            case "austin":
                return .austin
            case "paris":
                return .paris
            default:
                break
            }

            guard let name = name?.lowercased().trimmingCharacters(in: .whitespacesAndNewlines) else {
                return .general
            }
            if name.contains("london") { return .london }
            if name.contains("new york") || name.contains("nyc") || name.contains("manhattan") || name.contains("brooklyn") { return .nyc }
            if name.contains("boston") { return .boston }
            if name.contains("austin") { return .austin }
            if name.contains("paris") { return .paris }
            return .general
        }
    }

    // MARK: - Trivia Data (each fact matched to its specific illustration)

    struct CityFact {
        let textKey: String  // Localizable.strings key
        let image: String    // asset catalog name for the matched illustration

        /// Resolved localized text at runtime based on device language
        var text: String {
            NSLocalizedString(textKey, comment: "")
        }
    }

    private let generalFacts: [CityFact] = [
        CityFact(textKey: "loading.fact.general.1", image: ""),
        CityFact(textKey: "loading.fact.general.2", image: ""),
        CityFact(textKey: "loading.fact.general.3", image: "")
    ]

    private let cityFacts: [CityKey: [CityFact]] = [
        // LONDON — 6 illustrations, 3 facts each
        .london: [
            CityFact(textKey: "loading.fact.london.1a", image: "loading_london_1"),
            CityFact(textKey: "loading.fact.london.1b", image: "loading_london_1"),
            CityFact(textKey: "loading.fact.london.1c", image: "loading_london_1"),
            CityFact(textKey: "loading.fact.london.2a", image: "loading_london_2"),
            CityFact(textKey: "loading.fact.london.2b", image: "loading_london_2"),
            CityFact(textKey: "loading.fact.london.2c", image: "loading_london_2"),
            CityFact(textKey: "loading.fact.london.3a", image: "loading_london_3"),
            CityFact(textKey: "loading.fact.london.3b", image: "loading_london_3"),
            CityFact(textKey: "loading.fact.london.3c", image: "loading_london_3"),
            CityFact(textKey: "loading.fact.london.4a", image: "loading_london_4"),
            CityFact(textKey: "loading.fact.london.4b", image: "loading_london_4"),
            CityFact(textKey: "loading.fact.london.4c", image: "loading_london_4"),
            CityFact(textKey: "loading.fact.london.5a", image: "loading_london_5"),
            CityFact(textKey: "loading.fact.london.5b", image: "loading_london_5"),
            CityFact(textKey: "loading.fact.london.5c", image: "loading_london_5"),
            CityFact(textKey: "loading.fact.london.6a", image: "loading_london_6"),
            CityFact(textKey: "loading.fact.london.6b", image: "loading_london_6"),
            CityFact(textKey: "loading.fact.london.6c", image: "loading_london_6")
        ],

        // NYC — 6 illustrations, 3 facts each
        .nyc: [
            CityFact(textKey: "loading.fact.nyc.1a", image: "loading_nyc_1"),
            CityFact(textKey: "loading.fact.nyc.1b", image: "loading_nyc_1"),
            CityFact(textKey: "loading.fact.nyc.1c", image: "loading_nyc_1"),
            CityFact(textKey: "loading.fact.nyc.2a", image: "loading_nyc_2"),
            CityFact(textKey: "loading.fact.nyc.2b", image: "loading_nyc_2"),
            CityFact(textKey: "loading.fact.nyc.2c", image: "loading_nyc_2"),
            CityFact(textKey: "loading.fact.nyc.3a", image: "loading_nyc_3"),
            CityFact(textKey: "loading.fact.nyc.3b", image: "loading_nyc_3"),
            CityFact(textKey: "loading.fact.nyc.3c", image: "loading_nyc_3"),
            CityFact(textKey: "loading.fact.nyc.4a", image: "loading_nyc_4"),
            CityFact(textKey: "loading.fact.nyc.4b", image: "loading_nyc_4"),
            CityFact(textKey: "loading.fact.nyc.4c", image: "loading_nyc_4"),
            CityFact(textKey: "loading.fact.nyc.5a", image: "loading_nyc_5"),
            CityFact(textKey: "loading.fact.nyc.5b", image: "loading_nyc_5"),
            CityFact(textKey: "loading.fact.nyc.5c", image: "loading_nyc_5"),
            CityFact(textKey: "loading.fact.nyc.6a", image: "loading_nyc_6"),
            CityFact(textKey: "loading.fact.nyc.6b", image: "loading_nyc_6"),
            CityFact(textKey: "loading.fact.nyc.6c", image: "loading_nyc_6")
        ],

        // PARIS — 6 illustrations, 3 facts each
        .paris: [
            CityFact(textKey: "loading.fact.paris.1a", image: "loading_paris_1"),
            CityFact(textKey: "loading.fact.paris.1b", image: "loading_paris_1"),
            CityFact(textKey: "loading.fact.paris.1c", image: "loading_paris_1"),
            CityFact(textKey: "loading.fact.paris.2a", image: "loading_paris_2"),
            CityFact(textKey: "loading.fact.paris.2b", image: "loading_paris_2"),
            CityFact(textKey: "loading.fact.paris.2c", image: "loading_paris_2"),
            CityFact(textKey: "loading.fact.paris.3a", image: "loading_paris_3"),
            CityFact(textKey: "loading.fact.paris.3b", image: "loading_paris_3"),
            CityFact(textKey: "loading.fact.paris.3c", image: "loading_paris_3"),
            CityFact(textKey: "loading.fact.paris.4a", image: "loading_paris_4"),
            CityFact(textKey: "loading.fact.paris.4b", image: "loading_paris_4"),
            CityFact(textKey: "loading.fact.paris.4c", image: "loading_paris_4"),
            CityFact(textKey: "loading.fact.paris.5a", image: "loading_paris_5"),
            CityFact(textKey: "loading.fact.paris.5b", image: "loading_paris_5"),
            CityFact(textKey: "loading.fact.paris.5c", image: "loading_paris_5"),
            CityFact(textKey: "loading.fact.paris.6a", image: "loading_paris_6"),
            CityFact(textKey: "loading.fact.paris.6b", image: "loading_paris_6"),
            CityFact(textKey: "loading.fact.paris.6c", image: "loading_paris_6")
        ],

        // AUSTIN — 6 illustrations, 3 facts each
        .austin: [
            CityFact(textKey: "loading.fact.austin.1a", image: "loading_austin_1"),
            CityFact(textKey: "loading.fact.austin.1b", image: "loading_austin_1"),
            CityFact(textKey: "loading.fact.austin.1c", image: "loading_austin_1"),
            CityFact(textKey: "loading.fact.austin.2a", image: "loading_austin_2"),
            CityFact(textKey: "loading.fact.austin.2b", image: "loading_austin_2"),
            CityFact(textKey: "loading.fact.austin.2c", image: "loading_austin_2"),
            CityFact(textKey: "loading.fact.austin.3a", image: "loading_austin_3"),
            CityFact(textKey: "loading.fact.austin.3b", image: "loading_austin_3"),
            CityFact(textKey: "loading.fact.austin.3c", image: "loading_austin_3"),
            CityFact(textKey: "loading.fact.austin.4a", image: "loading_austin_4"),
            CityFact(textKey: "loading.fact.austin.4b", image: "loading_austin_4"),
            CityFact(textKey: "loading.fact.austin.4c", image: "loading_austin_4"),
            CityFact(textKey: "loading.fact.austin.5a", image: "loading_austin_5"),
            CityFact(textKey: "loading.fact.austin.5b", image: "loading_austin_5"),
            CityFact(textKey: "loading.fact.austin.5c", image: "loading_austin_5"),
            CityFact(textKey: "loading.fact.austin.6a", image: "loading_austin_6"),
            CityFact(textKey: "loading.fact.austin.6b", image: "loading_austin_6"),
            CityFact(textKey: "loading.fact.austin.6c", image: "loading_austin_6")
        ],

        // BOSTON — 6 illustrations, 3 facts each
        .boston: [
            CityFact(textKey: "loading.fact.boston.1a", image: "loading_boston_1"),
            CityFact(textKey: "loading.fact.boston.1b", image: "loading_boston_1"),
            CityFact(textKey: "loading.fact.boston.1c", image: "loading_boston_1"),
            CityFact(textKey: "loading.fact.boston.2a", image: "loading_boston_2"),
            CityFact(textKey: "loading.fact.boston.2b", image: "loading_boston_2"),
            CityFact(textKey: "loading.fact.boston.2c", image: "loading_boston_2"),
            CityFact(textKey: "loading.fact.boston.3a", image: "loading_boston_3"),
            CityFact(textKey: "loading.fact.boston.3b", image: "loading_boston_3"),
            CityFact(textKey: "loading.fact.boston.3c", image: "loading_boston_3"),
            CityFact(textKey: "loading.fact.boston.4a", image: "loading_boston_4"),
            CityFact(textKey: "loading.fact.boston.4b", image: "loading_boston_4"),
            CityFact(textKey: "loading.fact.boston.4c", image: "loading_boston_4"),
            CityFact(textKey: "loading.fact.boston.5a", image: "loading_boston_5"),
            CityFact(textKey: "loading.fact.boston.5b", image: "loading_boston_5"),
            CityFact(textKey: "loading.fact.boston.5c", image: "loading_boston_5"),
            CityFact(textKey: "loading.fact.boston.6a", image: "loading_boston_6"),
            CityFact(textKey: "loading.fact.boston.6b", image: "loading_boston_6"),
            CityFact(textKey: "loading.fact.boston.6c", image: "loading_boston_6")
        ]
    ]
}
