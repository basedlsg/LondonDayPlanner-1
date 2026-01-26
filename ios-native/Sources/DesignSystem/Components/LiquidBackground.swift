import SwiftUI

/// Animated liquid background with floating blobs
struct LiquidBackground: View {
    @State private var animateBlob1 = false
    @State private var animateBlob2 = false
    @State private var animateBlob3 = false
    
    var intensity: Double = 1.0
    
    var body: some View {
        ZStack {
            // Base background
            Color.white
            
            // Top-Left Cyan Gradient (Stronger)
            RadialGradient(
                colors: [
                    Color.cyan.opacity(0.35 * intensity), // Visible Cyan
                    Color.cyan.opacity(0.1 * intensity),
                    .clear
                ],
                center: .topLeading,
                startRadius: 50,
                endRadius: 700
            )
            .ignoresSafeArea()
            
            // Bottom-Right Pink Gradient (Stronger)
            RadialGradient(
                colors: [
                    Color.pink.opacity(0.25 * intensity), // Visible Pink
                    Color.pink.opacity(0.05 * intensity),
                    .clear
                ],
                center: .bottomTrailing,
                startRadius: 50,
                endRadius: 700
            )
            .ignoresSafeArea()
            
            // Center White Glow (Softner)
            RadialGradient(
                colors: [
                    Color.white.opacity(0.5), // Keep glow consistent
                    .clear
                ],
                center: .center,
                startRadius: 50,
                endRadius: 500
            )
        }
    }

}

#Preview {
    LiquidBackground()
        .ignoresSafeArea()
}
