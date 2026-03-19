import SwiftUI

/// Full-screen loading view shown during itinerary generation
/// Matches the pink "PLAN" loading screen design
struct GeneratingLoadingView: View {
    @State private var progress: CGFloat = 0.0
    @State private var currentTrivia: TravelTrivia = Self.triviaList.randomElement()!
    @State private var triviaOpacity: Double = 1.0

    let triviaTimer = Timer.publish(every: 5, on: .main, in: .common).autoconnect()

    var body: some View {
        ZStack {
            // Pink gradient background
            LinearGradient(
                colors: [
                    Color(hex: "E8879B"),
                    Color(hex: "EA8FA2"),
                    Color(hex: "F0A0B0")
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()
                    .frame(height: 80)

                // PLAN title
                Text("PLAN")
                    .font(DesignTokens.Fonts.rozhaOne(size: 80))
                    .foregroundStyle(.white)

                // Subtitle
                Text(NSLocalizedString("loading.planning", comment: ""))
                    .font(.system(size: 17, weight: .medium))
                    .foregroundStyle(.white.opacity(0.9))
                    .padding(.top, 4)

                // Progress bar
                ZStack(alignment: .leading) {
                    // Track
                    RoundedRectangle(cornerRadius: 6)
                        .fill(.white.opacity(0.3))
                        .frame(height: 12)

                    // Fill
                    GeometryReader { geo in
                        RoundedRectangle(cornerRadius: 6)
                            .fill(
                                LinearGradient(
                                    colors: [Color(hex: "4A9FD9"), Color(hex: "5BB5E8")],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .frame(width: geo.size.width * progress, height: 12)
                    }
                    .frame(height: 12)
                }
                .padding(.horizontal, 50)
                .padding(.top, 20)

                Spacer()
                    .frame(height: 60)

                // Travel trivia section
                VStack(spacing: 12) {
                    Text("TRAVEL TRIVIA")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(.white)
                        .tracking(2)

                    Text("DID YOU KNOW?")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(.white.opacity(0.85))

                    Text(currentTrivia.fact)
                        .font(.system(size: 16, weight: .medium))
                        .foregroundStyle(.white)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 40)
                        .opacity(triviaOpacity)
                }

                Spacer()

                // World map illustration
                worldMapSection
                    .padding(.bottom, 40)
            }
        }
        .onAppear {
            startProgressAnimation()
        }
        .onReceive(triviaTimer) { _ in
            cycleTrivia()
        }
    }

    // MARK: - World Map

    private var worldMapSection: some View {
        ZStack {
            // Simple dotted world map outline using SF Symbols globe
            Image(systemName: "globe.europe.africa")
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(height: 200)
                .foregroundStyle(.white.opacity(0.3))

            // City labels
            VStack {
                HStack {
                    cityDot(name: "LONDON", highlighted: true)
                    Spacer()
                }
                .padding(.leading, 80)

                Spacer()
            }
            .frame(height: 200)
        }
        .padding(.horizontal, 20)
    }

    private func cityDot(name: String, highlighted: Bool = false) -> some View {
        HStack(spacing: 4) {
            Circle()
                .fill(highlighted ? Color(hex: "4A9FD9") : .white.opacity(0.5))
                .frame(width: 8, height: 8)
            Text(name)
                .font(.system(size: 10, weight: .bold))
                .foregroundStyle(highlighted ? .white : .white.opacity(0.5))
        }
    }

    // MARK: - Animations

    private func startProgressAnimation() {
        // Animate progress from 0 to ~85% over 15 seconds (typical generation time)
        withAnimation(.easeInOut(duration: 8)) {
            progress = 0.6
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 8) {
            withAnimation(.easeInOut(duration: 12)) {
                progress = 0.85
            }
        }
    }

    private func cycleTrivia() {
        withAnimation(.easeOut(duration: 0.3)) {
            triviaOpacity = 0
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            var next = Self.triviaList.randomElement()!
            while next.fact == currentTrivia.fact {
                next = Self.triviaList.randomElement()!
            }
            currentTrivia = next
            withAnimation(.easeIn(duration: 0.3)) {
                triviaOpacity = 1
            }
        }
    }

    // MARK: - Trivia Data

    struct TravelTrivia {
        let fact: String
    }

    static let triviaList: [TravelTrivia] = [
        TravelTrivia(fact: "The London Underground, known as 'The Tube', opened in 1863, making it the oldest subway system in the world."),
        TravelTrivia(fact: "Big Ben is actually the name of the bell inside the tower, not the tower itself. The tower is called Elizabeth Tower."),
        TravelTrivia(fact: "London has over 170 museums, and many of them are completely free to visit."),
        TravelTrivia(fact: "The River Thames is over 200 miles long and flows through 16 counties."),
        TravelTrivia(fact: "Tower Bridge took 8 years to build and was completed in 1894."),
        TravelTrivia(fact: "London's black cabs drivers must pass 'The Knowledge', a test that takes 2-4 years to study for."),
        TravelTrivia(fact: "Hyde Park is one of the largest parks in London, covering 350 acres."),
        TravelTrivia(fact: "There are over 8 million trees in London, making it one of the greenest cities in the world."),
        TravelTrivia(fact: "The Shard is the tallest building in Western Europe at 310 metres."),
        TravelTrivia(fact: "Buckingham Palace has 775 rooms, including 78 bathrooms."),
    ]
}
