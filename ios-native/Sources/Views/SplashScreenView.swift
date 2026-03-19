import SwiftUI

struct SplashScreenView: View {
    @State private var isActive = false
    @State private var blob1Scale: CGFloat = 0.8
    @State private var blob2Scale: CGFloat = 0.8
    @State private var opacity: Double = 0
    
    var body: some View {
        if isActive {
            ContentView()
        } else {
            ZStack {
                // Background
                Color(hex: "0f0f1a").ignoresSafeArea()
                
                // Animated Blobs
                ZStack {
                    Circle()
                        .fill(Color.accentPink.opacity(0.4))
                        .frame(width: 250, height: 250)
                        .blur(radius: 50)
                        .offset(x: -50, y: -50)
                        .scaleEffect(blob1Scale)
                    
                    Circle()
                        .fill(Color.accentBlue.opacity(0.4))
                        .frame(width: 250, height: 250)
                        .blur(radius: 50)
                        .offset(x: 50, y: 50)
                        .scaleEffect(blob2Scale)
                }
                
                // Logo/Title
                VStack(spacing: 20) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 80))
                        .foregroundStyle(
                            LinearGradient(
                                colors: [.accentPink, .white],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .shadow(color: .accentPink.opacity(0.5), radius: 20)
                    
                    Text(NSLocalizedString("app.title", comment: "Plan Your Perfect Day"))
                        .font(.system(size: 40, weight: .bold))
                        .multilineTextAlignment(.center)
                        .foregroundStyle(.white)
                        .shadow(color: .white.opacity(0.3), radius: 10)
                }
                .opacity(opacity)
                .scaleEffect(opacity)
            }
            .onAppear {
                // Animate blobs
                withAnimation(.easeInOut(duration: 2).repeatForever(autoreverses: true)) {
                    blob1Scale = 1.1
                }
                withAnimation(.easeInOut(duration: 2.5).repeatForever(autoreverses: true)) {
                    blob2Scale = 1.2
                }
                
                // Fade in logo
                withAnimation(.easeOut(duration: 1.0)) {
                    opacity = 1.0
                }
                
                // Transition to main app
                DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) {
                    withAnimation {
                        isActive = true
                    }
                }
            }
        }
    }
}

#Preview {
    SplashScreenView()
}
