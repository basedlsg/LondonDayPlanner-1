import SwiftUI
import StoreKit

/// App settings and preferences
struct SettingsView: View {
    @EnvironmentObject var cityManager: CityManager
    @AppStorage("notifications_enabled") private var notificationsEnabled = true
    @AppStorage("weather_alerts") private var weatherAlerts = true
    @AppStorage("distance_unit") private var distanceUnit = "km"
    
    @StateObject private var store = StoreManager.shared
    @StateObject private var authService = AuthenticationService.shared
    @StateObject private var stressTest = StressTestService.shared
    @State private var showSubscription = false
    @State private var showStressTest = false
    @State private var showDeleteAlert = false
    @State private var didAutoOpenSubscription = false
    private let launchArguments = ProcessInfo.processInfo.arguments
    
    var body: some View {
        ZStack {
            LiquidBackground()
                .ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Centered Header (Rozha One)
                Text(NSLocalizedString("settings.title", comment: "Settings"))
                    .font(DesignTokens.Fonts.rozhaOne(size: 48))
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
                    .padding(.top, 40)
                    .padding(.bottom, DesignTokens.Spacing.lg)
                
                ScrollView {
                    VStack(spacing: DesignTokens.Spacing.lg) {
                        // Account section
                        accountSection
                        
                        // Preferences section
                        preferencesSection
                        
                        // Notifications section
                        notificationsSection
                        
                        // About section
                        aboutSection
                        
                        // Debug Section (Stress Testing)
                        #if DEBUG
                        debugSection
                        #endif
                        
                        Spacer(minLength: 100)
                    }
                    .padding()
                }
            }
        }
        // Hide default navigation bar to use custom header
        .toolbar(.hidden, for: .navigationBar)
        .sheet(isPresented: $showSubscription) {
            SubscriptionView()
                .presentationDetents([.large])
                .presentationCornerRadius(32)
        }
        .onAppear {
            guard launchArguments.contains("--record-open-subscription"), !didAutoOpenSubscription else { return }
            didAutoOpenSubscription = true

            DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
                showSubscription = true
            }
        }
        .alert(NSLocalizedString("settings.deleteAccountTitle", value: "Delete Account?", comment: ""), isPresented: $showDeleteAlert) {
            Button("Cancel", role: .cancel) { }
            Button("Delete", role: .destructive) {
                authService.signOut()
            }
        } message: {
            Text(NSLocalizedString("settings.deleteAccountMessage", value: "This will remove your account and all saved data from this device. This action cannot be undone.", comment: ""))
        }
    }
    
    // MARK: - Account Section
    
    private var accountSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text(NSLocalizedString("settings.account", comment: "Account"))
                .font(.headline)
                .foregroundStyle(.black)
            
            GlassCard(variant: .frosted) {
                VStack(spacing: 0) {
                    // Sign in prompt (or user info)
                    HStack {
                        if authService.isAuthenticated {
                            Image(systemName: "person.circle.fill")
                                .font(.system(size: 44))
                                .foregroundStyle(Color.accentPink)
                            
                            VStack(alignment: .leading, spacing: 2) {
                                HStack {
                                    Text(authService.fullName?.givenName ?? "User")
                                        .font(.headline)
                                        .foregroundStyle(.black)
                                    
                                    if true {
                                        Text("PRO")
                                            .font(.caption2)
                                            .fontWeight(.bold)
                                            .foregroundStyle(.white)
                                            .padding(.horizontal, 6)
                                            .padding(.vertical, 2)
                                            .background(Color.accentPink, in: Capsule())
                                    }
                                }
                                Text(authService.email ?? NSLocalizedString("settings.syncDescription", comment: "Sync your trips"))
                                    .font(.caption)
                                    .foregroundStyle(.gray)
                            }
                        } else {
                            // Sign In Button
                            Button {
                                authService.signInWithApple()
                            } label: {
                                HStack(spacing: 12) {
                                    Image(systemName: "apple.logo")
                                        .font(.title2)
                                    Text("Sign in with Apple")
                                        .fontWeight(.semibold)
                                }
                                .foregroundStyle(.white)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 10)
                                .background(Color.black, in: Capsule())
                            }
                        }
                        
                        Spacer()
                    }
                    .padding(DesignTokens.Spacing.md)
                    
                    Divider()
                        .background(Color.gray.opacity(0.2))
                        
                    // Subscription Row
                    Button {
                        showSubscription = true
                    } label: {
                        HStack {
                            Image(systemName: "crown.fill")
                                .foregroundStyle(Color.yellow) // Gold for premium
                                .frame(width: 24)
                            
                            Text(NSLocalizedString("settings.subscription", comment: "Subscription"))
                                .foregroundStyle(.black)
                            
                            Spacer()
                            
                            Text(NSLocalizedString("subscription.active", value: "Active", comment: ""))
                                .font(.subheadline)
                                .foregroundStyle(.green)
                            
                            Image(systemName: "chevron.right")
                                .foregroundStyle(.gray.opacity(0.5))
                        }
                        .padding(DesignTokens.Spacing.md)
                    }
                    .accessibilityIdentifier("settings.subscriptionRow")
                    
                    if authService.isAuthenticated {
                        Divider()
                            .background(Color.gray.opacity(0.2))
                        
                        Button {
                            showDeleteAlert = true
                        } label: {
                            HStack {
                                Image(systemName: "trash")
                                    .foregroundStyle(.red)
                                    .frame(width: 24)
                                
                                Text(NSLocalizedString("settings.deleteAccount", value: "Delete Account", comment: "Delete Account"))
                                    .foregroundStyle(.red)
                                
                                Spacer()
                            }
                            .padding(DesignTokens.Spacing.md)
                        }
                    }
                }
            }
        }
    }
    
    // MARK: - Preferences Section
    
    private var preferencesSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text(NSLocalizedString("settings.preferences", comment: "Preferences"))
                .font(.headline)
                .foregroundStyle(.black)
            
            GlassCard(variant: .light) {
                VStack(spacing: 0) {
                    // Default city
                    SettingsRow(
                        icon: "globe",
                        title: NSLocalizedString("settings.defaultCity", comment: "Default City"),
                        value: cityManager.currentCity?.name ?? "Not set"
                    )
                    
                    Divider()
                        .background(Color.gray.opacity(0.2))
                    
                    // Distance unit
                    SettingsRow(icon: "ruler", title: NSLocalizedString("settings.distanceUnit", comment: "Distance Unit")) {
                        Picker("", selection: $distanceUnit) {
                            Text("km").tag("km")
                            Text("mi").tag("mi")
                        }
                        .pickerStyle(.segmented)
                        .frame(width: 100)
                    }
                }
            }
        }
    }
    
    // MARK: - Notifications Section
    
    private var notificationsSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text(NSLocalizedString("settings.notifications", comment: "Notifications"))
                .font(.headline)
                .foregroundStyle(.black)
            
            GlassCard(variant: .light) {
                VStack(spacing: 0) {
                    SettingsToggle(
                        icon: "bell",
                        title: NSLocalizedString("settings.pushNotifications", comment: "Push Notifications"),
                        isOn: $notificationsEnabled
                    )
                    
                    Divider()
                        .background(Color.gray.opacity(0.2))
                    
                    SettingsToggle(
                        icon: "cloud.sun",
                        title: NSLocalizedString("settings.weatherAlerts", comment: "Weather Alerts"),
                        isOn: $weatherAlerts
                    )
                    .disabled(!notificationsEnabled)
                    .opacity(notificationsEnabled ? 1 : 0.5)
                }
            }
        }
    }
    
    @Environment(\.requestReview) var requestReview

    // MARK: - About Section
    
    private var aboutSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text(NSLocalizedString("settings.about", comment: "About"))
                .font(.headline)
                .foregroundStyle(.black)
            
            GlassCard(variant: .light) {
                VStack(spacing: 0) {
                    SettingsRow(icon: "info.circle", title: String(format: NSLocalizedString("settings.version", comment: ""), Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0"))
                    
                    Divider()
                        .background(Color.gray.opacity(0.2))
                    
                    NavigationLink {
                        LegalView(type: .privacy)
                    } label: {
                        SettingsRow(icon: "doc.text", title: "Privacy Policy", showChevron: true)
                    }
                    
                    Divider()
                        .background(Color.gray.opacity(0.2))
                    
                    NavigationLink {
                        LegalView(type: .terms)
                    } label: {
                        SettingsRow(icon: "doc.text", title: NSLocalizedString("settings.termsOfService", comment: "Terms of Service"), showChevron: true)
                    }
                    
                    Divider()
                        .background(Color.gray.opacity(0.2))
                    
                    Button {
                        requestReview()
                    } label: {
                        SettingsRow(icon: "star", title: "Rate App", showChevron: true)
                    }
                }
            }
        }
    }
    
    // MARK: - Debug Section
    
    #if DEBUG
    private var debugSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text("Debug & Stress Test")
                .font(.headline)
                .foregroundStyle(.black)
            
            GlassCard(variant: .light) {
                VStack(spacing: 0) {
                    if stressTest.isRunning {
                        VStack(spacing: 8) {
                            ProgressView("Running Test...", value: stressTest.progress)
                                .tint(.accentPink)
                            
                            HStack {
                                Text("Req: \(stressTest.totalRequests)")
                                Spacer()
                                Text("Success: \(stressTest.successfulRequests)")
                                    .foregroundStyle(.green)
                            }
                            .font(.caption)
                            
                            if !stressTest.logs.isEmpty {
                                Text(stressTest.logs[0])
                                    .font(.caption2)
                                    .foregroundStyle(.gray)
                                    .lineLimit(1)
                            }
                        }
                        .padding(DesignTokens.Spacing.md)
                    } else {
                        SettingsRow(icon: "hammer.fill", title: "Start Generation Stress Test") {
                            Button {
                                stressTest.startTest(iterations: 5)
                            } label: {
                                Text("Start")
                                    .fontWeight(.bold)
                                    .foregroundStyle(.white)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 6)
                                    .background(Color.accentPink, in: Capsule())
                            }
                        }
                    }
                }
            }
        }
    }
    #endif
}
    


// MARK: - Settings Row

struct SettingsRow<Content: View>: View {
    let icon: String
    let title: String
    var value: String? = nil
    var showChevron: Bool = false
    var content: (() -> Content)? = nil
    
    init(
        icon: String,
        title: String,
        value: String? = nil,
        showChevron: Bool = false
    ) where Content == EmptyView {
        self.icon = icon
        self.title = title
        self.value = value
        self.showChevron = showChevron
        self.content = nil
    }
    
    init(
        icon: String,
        title: String,
        @ViewBuilder content: @escaping () -> Content
    ) {
        self.icon = icon
        self.title = title
        self.value = nil
        self.showChevron = false
        self.content = content
    }
    
    var body: some View {
        HStack {
            Image(systemName: icon)
                .foregroundStyle(Color.accentBlue)
                .frame(width: 24)
            
            Text(title)
                .foregroundStyle(.black)
            
            Spacer()
            
            if let content = content {
                content()
            } else if let value = value {
                Text(value)
                    .foregroundStyle(.gray)
            }
            
            if showChevron {
                Image(systemName: "chevron.right")
                    .foregroundStyle(.gray.opacity(0.5))
            }
        }
        .padding(DesignTokens.Spacing.md)
    }
}

// MARK: - Settings Toggle

struct SettingsToggle: View {
    let icon: String
    let title: String
    @Binding var isOn: Bool
    
    var body: some View {
        HStack {
            Image(systemName: icon)
                .foregroundStyle(Color.accentBlue)
                .frame(width: 24)
            
            Text(title)
                .foregroundStyle(.black)
            
            Spacer()
            
            Toggle("", isOn: $isOn)
                .tint(Color.accentPink)
        }
        .padding(DesignTokens.Spacing.md)
    }
}

#Preview {
    NavigationStack {
        SettingsView()
    }
    .environmentObject(CityManager())
}
