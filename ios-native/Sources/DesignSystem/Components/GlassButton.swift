import SwiftUI

/// Glass-styled button with press feedback and optional glow
struct GlassButton: View {
    let title: String
    let icon: String?
    var style: ButtonStyle = .primary
    var isLoading: Bool = false
    let action: () -> Void
    
    enum ButtonStyle {
        case primary, secondary, ghost, solidWhite
        
        var backgroundColor: Color {
            switch self {
            case .primary: return .accentPink.opacity(0.2)
            case .secondary: return .accentBlue.opacity(0.2)
            case .ghost: return .clear
            case .solidWhite: return .white
            }
        }
        
        var foregroundColor: Color {
            switch self {
            case .primary: return .accentPink
            case .secondary: return .accentBlue
            case .ghost: return DesignTokens.Colors.textSecondary
            case .solidWhite: return Color(hex: "007AFF") // System Blue for high contrast against white
            }
        }
        
        var glowColor: Color {
            switch self {
            case .primary: return .accentPink
            case .secondary: return .accentBlue
            case .ghost: return .clear
            case .solidWhite: return .white
            }
        }
    }
    
    init(
        _ title: String,
        icon: String? = nil,
        style: ButtonStyle = .primary,
        isLoading: Bool = false,
        action: @escaping () -> Void
    ) {
        self.title = title
        self.icon = icon
        self.style = style
        self.isLoading = isLoading
        self.action = action
    }
    
    @Environment(\.isEnabled) private var isEnabled
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: DesignTokens.Spacing.xs) {
                if isLoading {
                    ProgressView()
                        .progressViewStyle(.circular)
                        .tint(style.foregroundColor)
                        .scaleEffect(0.8)
                } else if let icon = icon {
                    Image(systemName: icon)
                        .font(.system(size: 16, weight: .semibold))
                }
                
                Text(title)
                    .font(.system(size: 16, weight: .semibold))
            }
            .foregroundStyle(style.foregroundColor.opacity(isEnabled ? 1.0 : 0.6)) // Slightly dim text when disabled
            .padding(.horizontal, DesignTokens.Spacing.lg)
            .padding(.vertical, DesignTokens.Spacing.sm)
            .background {
                if style == .solidWhite {
                    Capsule()
                        .fill(
                            LinearGradient(
                                colors: [
                                    Color.white, // Top Left: Pure White
                                    Color(hex: "F4F9FA") // Bottom Right: Very faint Cyan-White
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .opacity(isEnabled ? 1.0 : 0.7) // Dim background slightly when disabled
                } else {
                    // Liquid Gradient Background
                    ZStack {
                        // Glass Material (Base)
                        Rectangle()
                            .fill(.ultraThinMaterial)
                            .opacity(0.6)
                        
                        if style != .ghost {
                            LinearGradient(
                                colors: [
                                    style.glowColor.opacity(isEnabled ? 0.6 : 0.4),
                                    style.glowColor.opacity(isEnabled ? 0.3 : 0.2)
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        }
                    }
                    .clipShape(Capsule())
                }
            }
            .overlay(
                Group {
                    if style == .solidWhite {
                        Capsule()
                            .strokeBorder(Color.white, lineWidth: 1)
                    } else if style != .ghost {
                        Capsule()
                            .stroke(
                                LinearGradient(
                                    colors: [
                                        style.foregroundColor.opacity(isEnabled ? 0.5 : 0.4),
                                        style.foregroundColor.opacity(isEnabled ? 0.1 : 0.1)
                                    ],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                ),
                                lineWidth: 1
                            )
                    }
                }
            )
            .shadow(
                color: style == .solidWhite ? Color.black.opacity(0.05) : style.glowColor.opacity(isEnabled ? 0.3 : 0.1),
                radius: style == .solidWhite ? 12 : (isEnabled ? 10 : 0),
                x: 0,
                y: style == .solidWhite ? 6 : (isEnabled ? 4 : 0)
            )
        }
        .buttonStyle(PressButtonStyle())
        .disabled(isLoading) // Remove default disabled() here to keep our custom style interaction or just let it pass but style manually above
    }
}

/// Custom button style with press feedback
struct PressButtonStyle: SwiftUI.ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
            .opacity(configuration.isPressed ? 0.8 : 1.0)
            .animation(.spring(response: 0.2, dampingFraction: 0.6), value: configuration.isPressed)
    }
}

#Preview {
    ZStack {
        LiquidBackground()
        
        VStack(spacing: 20) {
            GlassButton("Plan My Day", icon: "sparkles") {
                print("Primary tapped")
            }
            
            GlassButton("View Map", icon: "map", style: .secondary) {
                print("Secondary tapped")
            }
            
            GlassButton("Cancel", style: .ghost) {
                print("Ghost tapped")
            }
            
            GlassButton("Loading...", icon: "arrow.clockwise", isLoading: true) {
                print("Loading...")
            }
        }
    }
}
