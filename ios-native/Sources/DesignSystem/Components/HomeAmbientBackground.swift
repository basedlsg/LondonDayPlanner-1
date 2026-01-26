import SwiftUI

/// A subtle, atmospheric glow background for the Home Screen
struct HomeAmbientBackground: View {
    var body: some View {
        ZStack(alignment: .top) {
            // 1. Base Layer: Absolute Pure White
            Color.white.ignoresSafeArea()

            // 2. The "Atmosphere" (Restricted to top 30% of screen)
            LinearGradient(
                colors: [
                    Color(hex: "D0F5FA").opacity(0.6), // Top: Soft Cyan
                    Color.white.opacity(0.0)           // Bottom: Fades to invisible
                ],
                startPoint: .top,
                endPoint: .init(x: 0.5, y: 0.35) // CRITICAL: Stops 35% down the screen
            )
            .ignoresSafeArea()
            .frame(height: UIScreen.main.bounds.height * 0.5) // Optimization: Don't render it below the fold
        }
    }
}

#Preview {
    HomeAmbientBackground()
}
