import SwiftUI

/// A glass-effect card container with iOS 26 Liquid Glass styling
struct GlassCard<Content: View>: View {
    let content: Content
    var variant: GlassVariant = .frosted
    var glow: GlowColor? = nil
    var shimmer: Bool = false
    var cornerRadius: CGFloat = DesignTokens.Radius.large
    
    enum GlassVariant {
        case light, frosted, heavy
        
        var material: Material {
            switch self {
            case .light: return .ultraThinMaterial
            case .frosted: return .thinMaterial
            case .heavy: return .regularMaterial
            }
        }
        
        var borderOpacity: Double {
            switch self {
            case .light: return 0.10
            case .frosted: return 0.20
            case .heavy: return 0.30
            }
        }
    }
    
    enum GlowColor {
        case pink, blue, mixed
        
        var shadow: Color {
            switch self {
            case .pink: return Color.accentPink
            case .blue: return Color.accentBlue
            case .mixed: return Color.accentPink
            }
        }
        
        var radius: CGFloat {
            switch self {
            case .pink, .blue: return 20
            case .mixed: return 30
            }
        }
    }
    
    init(
        variant: GlassVariant = .frosted,
        glow: GlowColor? = nil,
        shimmer: Bool = false,
        cornerRadius: CGFloat = DesignTokens.Radius.large,
        @ViewBuilder content: () -> Content
    ) {
        self.content = content()
        self.variant = variant
        self.glow = glow
        self.shimmer = shimmer
        self.cornerRadius = cornerRadius
    }
    
    var body: some View {
        content
            .background(
                ZStack {
                    // 1. "Thick" Material (Ice)
                    Rectangle()
                        .fill(Material.thickMaterial)
                        .environment(\.colorScheme, .light) // Force Light Mode
                    
                    // 2. The "Frost" Tint
                    Rectangle()
                        .fill(Color.white.opacity(0.5))
                }
            )
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
            // 3. Caustic Underglow (Subtle)
            .background {
                if variant != .light { // Only glow on prominent cards
                    RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                        .fill(Color(hex: "3ACCE1")) // VibrancyCyan
                        .opacity(0.12)
                        .blur(radius: 30)
                        .offset(y: 15)
                }
            }
            // 4. Refractive Gradient Border
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .strokeBorder(
                        LinearGradient(
                            colors: [
                                Color.white.opacity(0.8),
                                Color.white.opacity(0.2)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 1
                    )
                    .blendMode(.overlay)
            )
            // 5. Ambient Lift
            .shadow(color: Color.black.opacity(0.03), radius: 25, x: 0, y: 15)
            .modifier(ShimmerModifier(isActive: shimmer))
    }
}

/// Shimmer animation modifier
struct ShimmerModifier: ViewModifier {
    let isActive: Bool
    @State private var phase: CGFloat = 0
    
    func body(content: Content) -> some View {
        content
            .overlay(
                GeometryReader { geometry in
                    if isActive {
                        LinearGradient(
                            gradient: Gradient(colors: [
                                Color.clear,
                                Color.white.opacity(0.1),
                                Color.clear
                            ]),
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                        .frame(width: geometry.size.width * 2)
                        .offset(x: -geometry.size.width + (phase * geometry.size.width * 2))
                        .onAppear {
                            withAnimation(.linear(duration: 3).repeatForever(autoreverses: false)) {
                                phase = 1
                            }
                        }
                    }
                }
                .clipped()
            )
    }
}

#Preview {
    ZStack {
        LiquidBackground()
        
        VStack(spacing: 20) {
            GlassCard(variant: .light) {
                Text("Light Glass")
                    .padding()
                    .foregroundStyle(.white)
            }
            
            GlassCard(variant: .frosted, glow: .pink) {
                Text("Frosted Glass with Pink Glow")
                    .padding()
                    .foregroundStyle(.white)
            }
            
            GlassCard(variant: .heavy, shimmer: true) {
                Text("Heavy Glass with Shimmer")
                    .padding()
                    .foregroundStyle(.white)
            }
        }
        .padding()
    }
}
