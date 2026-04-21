import SwiftUI

/// Design tokens for the Liquid Glass design system
enum DesignTokens {
    // MARK: - Colors
    enum Colors {
        static let accentPink = Color(hex: "FFC0CB") // Keep existing pastel pink
        static let accentBlue = Color(hex: "ADD8E6") // Keep existing pastel blue

        // Text
        static let textPrimary = Color.black.opacity(0.85)
        static let textSecondary = Color.black.opacity(0.60)
        static let textVibrantCyan = Color(hex: "3ACCE1") // Vibrant Cyan for Subtitle

        // Glass (Light Mode)
        static let glassLight = Color.white.opacity(0.60)
        static let glassMedium = Color.white.opacity(0.80)
        static let glassHeavy = Color.white.opacity(0.95)

        // Borders
        static let borderLight = Color.white.opacity(0.40)
        static let borderMedium = Color.white.opacity(0.60)

        // Shadows
        static let shadowLight = Color.black.opacity(0.05)
        static let shadowMedium = Color.black.opacity(0.10)
        static let shadowCyan = Color(hex: "3ACCE1").opacity(0.15) // User requested colored shadow

        // Stitch Design Tokens (used in some card accents)
        static let stitchPrimary = Color(hex: "006783")       // teal/sky
        static let stitchSecondary = Color(hex: "97406d")      // pink
        static let stitchSurface = Color(hex: "f7f9ff")
        static let stitchBgStart = Color(hex: "E3F5FB")
        static let stitchBgEnd = Color(hex: "C9EEFA")

        // Unified Brand Gradient Colors
        static let brandPinkTop = Color(hex: "fbe4ee")       // Soft pink (top)
        static let brandBlueBottom = Color(hex: "d8f2f9")     // Soft blue (bottom)
    }

    // MARK: - Gradients
    enum Gradients {
        /// The unified brand background: pink top → white middle → blue bottom.
        /// Use on all content screens (Explore, Trips, Itinerary, Collection Detail, etc.)
        static let brandBackground = LinearGradient(
            stops: [
                .init(color: Colors.brandPinkTop, location: 0.0),
                .init(color: .white, location: 0.4),
                .init(color: .white, location: 0.6),
                .init(color: Colors.brandBlueBottom, location: 1.0)
            ],
            startPoint: .top,
            endPoint: .bottom
        )
    }
    
    // MARK: - Blur
    enum Blur {
        static let light: CGFloat = 10
        static let medium: CGFloat = 20
        static let heavy: CGFloat = 30
    }
    
    // MARK: - Corner Radius
    enum Radius {
        static let small: CGFloat = 12
        static let medium: CGFloat = 20
        static let large: CGFloat = 32
        static let extraLarge: CGFloat = 40
    }
    
    // MARK: - Spacing
    enum Spacing {
        static let xxs: CGFloat = 4
        static let xs: CGFloat = 10
        static let sm: CGFloat = 16
        static let md: CGFloat = 24
        static let lg: CGFloat = 32
        static let xl: CGFloat = 48
        static let xxl: CGFloat = 64
    }
    
    // MARK: - Animation
    enum Animation {
        static let springStiffness: Double = 300
        static let springDamping: Double = 25
        static let quickDuration: Double = 0.25
        static let standardDuration: Double = 0.4
        static let slowDuration: Double = 0.6
    }
    
    // MARK: - Fonts
    enum Fonts {
        static func rozhaOne(size: CGFloat) -> Font {
            return Font.custom("RozhaOne-Regular", size: size)
        }

        static func body(size: CGFloat = 16) -> Font {
            return Font.system(size: size, weight: .regular, design: .default)
        }

        static func inter(size: CGFloat, weight: Font.Weight = .regular) -> Font {
            return Font.system(size: size, weight: weight, design: .default)
        }

        static func jakartaSans(size: CGFloat, weight: Font.Weight = .semibold) -> Font {
            return Font.system(size: size, weight: weight, design: .rounded)
        }

        static func poppins(size: CGFloat, weight: Font.Weight = .semibold) -> Font {
            return Font.system(size: size, weight: weight, design: .default)
        }
    }
}

// MARK: - Color Extension
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
    
    static let accentPink = DesignTokens.Colors.accentPink
    static let accentBlue = DesignTokens.Colors.accentBlue
}
