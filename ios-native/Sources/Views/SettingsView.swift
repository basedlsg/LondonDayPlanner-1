import SwiftUI

/// App settings and preferences
struct SettingsView: View {
    @EnvironmentObject var cityManager: CityManager
    @AppStorage("notifications_enabled") private var notificationsEnabled = true
    @AppStorage("weather_alerts") private var weatherAlerts = true
    @AppStorage("distance_unit") private var distanceUnit = "km"
    
    var body: some View {
        ZStack {
            LiquidBackground()
                .ignoresSafeArea()
            
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
                    
                    Spacer(minLength: 100)
                }
                .padding()
            }
        }
        .navigationTitle("Settings")
    }
    
    // MARK: - Account Section
    
    private var accountSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text("Account")
                .font(.headline)
                .foregroundStyle(.black)
            
            GlassCard(variant: .frosted) {
                VStack(spacing: 0) {
                    // Sign in prompt (or user info)
                    HStack {
                        Image(systemName: "person.circle.fill")
                            .font(.system(size: 44))
                            .foregroundStyle(Color.accentPink)
                        
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Sign In")
                                .font(.headline)
                                .foregroundStyle(.black)
                            Text("Sync your trips across devices")
                                .font(.caption)
                                .foregroundStyle(.gray)
                        }
                        
                        Spacer()
                        
                        Image(systemName: "chevron.right")
                            .foregroundStyle(.gray.opacity(0.5))
                    }
                    .padding(DesignTokens.Spacing.md)
                }
            }
        }
    }
    
    // MARK: - Preferences Section
    
    private var preferencesSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text("Preferences")
                .font(.headline)
                .foregroundStyle(.black)
            
            GlassCard(variant: .light) {
                VStack(spacing: 0) {
                    // Default city
                    SettingsRow(
                        icon: "globe",
                        title: "Default City",
                        value: cityManager.currentCity?.name ?? "Not set"
                    )
                    
                    Divider()
                        .background(Color.gray.opacity(0.2))
                    
                    // Distance unit
                    SettingsRow(icon: "ruler", title: "Distance Unit") {
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
            Text("Notifications")
                .font(.headline)
                .foregroundStyle(.black)
            
            GlassCard(variant: .light) {
                VStack(spacing: 0) {
                    SettingsToggle(
                        icon: "bell",
                        title: "Push Notifications",
                        isOn: $notificationsEnabled
                    )
                    
                    Divider()
                        .background(Color.gray.opacity(0.2))
                    
                    SettingsToggle(
                        icon: "cloud.sun",
                        title: "Weather Alerts",
                        isOn: $weatherAlerts
                    )
                    .disabled(!notificationsEnabled)
                    .opacity(notificationsEnabled ? 1 : 0.5)
                }
            }
        }
    }
    
    // MARK: - About Section
    
    private var aboutSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text("About")
                .font(.headline)
                .foregroundStyle(.black)
            
            GlassCard(variant: .light) {
                VStack(spacing: 0) {
                    SettingsRow(icon: "info.circle", title: "Version", value: "1.0.0")
                    
                    Divider()
                        .background(Color.gray.opacity(0.2))
                    
                    SettingsRow(icon: "doc.text", title: "Privacy Policy", showChevron: true)
                    
                    Divider()
                        .background(Color.gray.opacity(0.2))
                    
                    SettingsRow(icon: "doc.text", title: "Terms of Service", showChevron: true)
                    
                    Divider()
                        .background(Color.gray.opacity(0.2))
                    
                    SettingsRow(icon: "star", title: "Rate App", showChevron: true)
                }
            }
        }
    }
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
