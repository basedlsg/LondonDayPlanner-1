import SwiftUI

/// Glass-styled text input field with focus glow
struct GlassTextField: View {
    let placeholder: String
    @Binding var text: String
    var icon: String? = nil
    var axis: Axis = .horizontal
    @FocusState private var isFocused: Bool
    
    var body: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            if let icon = icon {
                Image(systemName: icon)
                    .foregroundStyle(isFocused ? Color.accentPink : .white.opacity(0.5))
                    .animation(.easeInOut(duration: 0.2), value: isFocused)
            }
            
            TextField(placeholder, text: $text, axis: axis)
                .textFieldStyle(.plain)
                .foregroundStyle(.white)
                .tint(Color.accentPink)
                .focused($isFocused)
        }
        .padding(DesignTokens.Spacing.md)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.medium, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.medium, style: .continuous)
                .stroke(
                    isFocused ? Color.accentPink.opacity(0.5) : Color.white.opacity(0.1),
                    lineWidth: isFocused ? 2 : 1
                )
        )
        .shadow(
            color: isFocused ? Color.accentPink.opacity(0.3) : .clear,
            radius: isFocused ? 15 : 0
        )
        .animation(.easeInOut(duration: 0.2), value: isFocused)
    }
}

#Preview {
    ZStack {
        LiquidBackground()
        
        VStack(spacing: 20) {
            GlassTextField(
                placeholder: "Describe your perfect day...",
                text: .constant(""),
                icon: "text.bubble.fill"
            )
            
            GlassTextField(
                placeholder: "Multi-line input",
                text: .constant("Coffee at 10am in Greenwich Village, then visit MoMA around noon"),
                axis: .vertical
            )
            .frame(height: 100)
        }
        .padding()
    }
}
