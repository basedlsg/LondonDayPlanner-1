import SwiftUI

/// Main home screen for planning a day
/// Redesigned to match the "Liquid Glass" Unified Form Card aesthetic
struct HomeView: View {
    @EnvironmentObject var cityManager: CityManager
    @StateObject private var viewModel = HomeViewModel()
    @State private var showCityPicker = false
    @FocusState private var isInputFocused: Bool
    
    var body: some View {
        ZStack {
            // 1. Atmospheric Ambient Background
            HomeAmbientBackground()
            
            // 2. Main Content
            ScrollView {
                VStack(spacing: DesignTokens.Spacing.lg) {
                    // Header (Title & Subtitle)
                    headerSection
                        .padding(.top, 20)
                    
                    // Unified Form Card
                    unifiedFormCard
                    
                    // Plan Button
                    planButtonSection
                    
                    Spacer(minLength: 40)
                }
                .padding(DesignTokens.Spacing.md)
            }
            .scrollContentBackground(.hidden)
            
            // 3. Error Overlay
            if let error = viewModel.error {
                VStack {
                    Spacer()
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(Color.red.opacity(0.8))
                        .clipShape(Capsule())
                        .padding(.bottom, 100)
                }
                .transition(.move(edge: .bottom).combined(with: .opacity))
                .onAppear {
                    // Auto-hide error after 5 seconds
                    DispatchQueue.main.asyncAfter(deadline: .now() + 5) {
                        viewModel.error = nil
                    }
                }
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .fullScreenCover(isPresented: $viewModel.isLoading) {
            GeneratingLoadingView()
        }
        .sheet(isPresented: $showCityPicker) {
            CityPickerSheet(
                cities: cityManager.cities,
                selectedCity: cityManager.currentCity,
                onSelect: { city in
                    cityManager.selectCity(city)
                    showCityPicker = false
                }
            )
            .presentationDetents([.medium, .fraction(0.75)])
            .presentationCornerRadius(40) // iOS 26 High Radius
        }
        .task(id: cityManager.currentCity) {
            await viewModel.fetchWeather(for: cityManager.currentCity)
        }
        .onChange(of: cityManager.shouldAutoPlan) { shouldPlan in
            if shouldPlan {
                // Pre-fill form
                viewModel.selectedDate = Date()
                
                if let customQuery = cityManager.autoPlanQuery {
                    viewModel.query = customQuery
                    cityManager.autoPlanQuery = nil // Reset
                } else if let cityName = cityManager.currentCity?.name {
                    viewModel.query = "Plan a perfect day in \(cityName)"
                }
                
                // Focus input to encourage user review before submitting, 
                // or we could auto-submit. User said "builds the itinerary", 
                // so maybe auto-submit? Let's focus for now as it's safer UX.
                isInputFocused = true
                
                // Reset flag
                cityManager.shouldAutoPlan = false
            }
        }
        .navigationDestination(isPresented: $viewModel.showItinerary) {
            if let itinerary = viewModel.createdItinerary {
                ItineraryView(itinerary: itinerary)
            }
        }
    }
    
    // MARK: - Header Section
    
    private var headerSection: some View {
        VStack(spacing: 16) {
            Text(NSLocalizedString("home.title", comment: "Plan"))
                .font(DesignTokens.Fonts.rozhaOne(size: 80))
                .foregroundStyle(DesignTokens.Colors.textPrimary)
            
            Text(NSLocalizedString("home.subtitle", comment: "Subtitle"))
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(DesignTokens.Colors.textVibrantCyan)
                .multilineTextAlignment(.center)
        }
    }
    
    // MARK: - Unified Form Card
    
    private var unifiedFormCard: some View {
            // Content
            VStack(spacing: 0) {
                // 1. City Row
                CitySelectorRow(
                    city: cityManager.currentCity?.name ?? NSLocalizedString("input.selectCity", comment: "Select City"),
                    onTap: { showCityPicker = true }
                )
                
                Divider()
                    .overlay(Rectangle().frame(height: 1).foregroundStyle(Color.gray.opacity(0.1)))
                    .padding(.vertical, DesignTokens.Spacing.md)
                
                // 2. Date Row
                DateInputRow(
                    date: viewModel.selectedDate,
                    onTap: {
                        // Interaction handled by overlay
                    },
                    selection: $viewModel.selectedDate
                )
                
                Divider()
                    .overlay(Rectangle().frame(height: 1).foregroundStyle(Color.gray.opacity(0.1)))
                    .padding(.vertical, DesignTokens.Spacing.md)
                
                // 3. Time Row
                TimeInputRow(
                    date: $viewModel.selectedDate
                )
                
                Divider()
                    .overlay(Rectangle().frame(height: 1).foregroundStyle(Color.gray.opacity(0.1)))
                    .padding(.vertical, DesignTokens.Spacing.md)
                
                // 4. Plans Row
                PlansInputRow(
                    text: $viewModel.query,
                    isFocused: $isInputFocused
                )
            }
            .padding(DesignTokens.Spacing.lg)
            .background(
                ZStack {
                    // 1. "Thick" Material captures more light than UltraThin, turning it white instead of gray
                    Rectangle()
                        .fill(Material.thickMaterial) 
                        // 2. CRITICAL: Force Light Mode on the material so it ignores system darkening
                        .environment(\.colorScheme, .light) 
                    
                    // 3. The "Frost" Tint (The liquid layer)
                    Rectangle()
                        .fill(Color.white.opacity(0.5)) 
                }
            )
            .clipShape(RoundedRectangle(cornerRadius: 32, style: .continuous))
            // --- NEW: THE CAUSTIC UNDERGLOW ---
            .background {
                RoundedRectangle(cornerRadius: 32, style: .continuous)
                    .fill(Color(hex: "3ACCE1")) // VibrancyCyan
                    .opacity(0.12) // WAS 0.3 -> NOW 0.12 (Much more subtle)
                    .blur(radius: 30) // Slightly tighter blur
                    .offset(y: 15)
            }
            // ----------------------------------
            // 4. The Refractive Border (essential for liquid glass)
            .overlay(
                RoundedRectangle(cornerRadius: 32, style: .continuous)
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
            // 5. Ambient Lift (The shadow that separates glass from background)
            .shadow(color: Color.black.opacity(0.03), radius: 25, x: 0, y: 15)
    }
    
    // MARK: - Plan Button
    
    private var planButtonSection: some View {
        GlassButton(
            NSLocalizedString("input.planButton", comment: "Plan My Day"),
            icon: "sparkles",
            style: .solidWhite,
            isLoading: viewModel.isLoading
        ) {
            Task {
                await viewModel.createItinerary(city: cityManager.currentCity)
            }
        }
        .disabled(viewModel.query.isEmpty || cityManager.currentCity == nil)
    }
}

// MARK: - Sub-Components

/// Reusable Section Label (e.g., "CITY", "DATE")
struct FormSectionLabel: View {
    let text: String
    var body: some View {
        Text(text.uppercased())
            .font(.system(size: 11, weight: .bold, design: .default))
            .foregroundStyle(Color.gray.opacity(0.8))
            .tracking(1.0) // Spacing for "Small Caps" look
    }
}

/// 1. City Selector Row
struct CitySelectorRow: View {
    let city: String
    let onTap: () -> Void
    
    var body: some View {
        HStack(alignment: .top) {
            // Icon Circle
            Circle()
                .fill(Color(hex: "E0F6F8")) // Pale Cyan
                .frame(width: 44, height: 44)
                .overlay(
                    Image(systemName: "globe.europe.africa.fill")
                        .foregroundStyle(Color.cyan)
                )
            
            VStack(alignment: .leading, spacing: 4) {
                FormSectionLabel(text: NSLocalizedString("settings.city", comment: "City"))
                    .padding(.top, 2) // Baseline alignment correction
                
                Button(action: onTap) {
                    HStack {
                        Text(city)
                            .font(.title3)
                            .fontWeight(.black) // User requested Bolder (Black/Heavy)
                            .foregroundStyle(Color(hex: "0A1E29"))
                        
                        Image(systemName: "chevron.down")
                            .font(.caption.weight(.bold))
                            .scaleEffect(0.8)
                            .foregroundStyle(Color.gray.opacity(0.5))
                    }
                }
            }
            .padding(.leading, 8)
            
            Spacer()
        }
    }
}

/// 2. Date Input Row
struct DateInputRow: View {
    let date: Date
    let onTap: () -> Void
    @Binding var selection: Date
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) { // Tightened spacing
            FormSectionLabel(text: NSLocalizedString("input.date", comment: "Date"))
            
            HStack {
                // Value Pill
                ZStack {
                    // Display Text (Clean, no gray background)
                    Text(selection.formatted(date: .abbreviated, time: .omitted))
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(DesignTokens.Colors.textPrimary)
                        .padding(.horizontal, 16)
                        .frame(height: 50) // Explicit height for perfect centering
                        .background(
                            LinearGradient(
                                colors: [
                                    Color.white, // Top Left: Pure White
                                    Color(hex: "F4F9FA") // Bottom Right: Very faint Cyan-White
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        // Add the Rim Light to make it look like a 3D object
                        .overlay(
                            RoundedRectangle(cornerRadius: 18, style: .continuous)
                                .strokeBorder(Color.white, lineWidth: 1) // Pure white stroke catches the light
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                        // Use the Soft Shadow you already have
                        .shadow(color: Color.black.opacity(0.05), radius: 10, x: 0, y: 5)
                    
                    // Invisible DatePicker Overlay for interaction
                    DatePicker(
                        "",
                        selection: $selection,
                        displayedComponents: .date
                    )
                    .labelsHidden()
                    .colorMultiply(.clear) // Make invisible but interactive
                    .accentColor(.clear)
                }
                
                Spacer() // Push icon to edge
                
                Image(systemName: "calendar")
                    .font(.title3.weight(.medium))
                    .scaleEffect(1.1)
                    .foregroundStyle(Color.gray.opacity(0.4))
            }
        }
    }
}

/// 3. Time Input Row
struct TimeInputRow: View {
    @Binding var date: Date
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) { // Tightened spacing
            FormSectionLabel(text: NSLocalizedString("input.time", comment: "Time"))
            
            HStack {
                // Value Pill
                ZStack {
                    // Display Text
                    Text(date.formatted(date: .omitted, time: .shortened))
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(DesignTokens.Colors.textPrimary)
                        .padding(.horizontal, 16)
                        .frame(height: 50) // Explicit height for perfect centering
                        .background(
                            LinearGradient(
                                colors: [
                                    Color.white, // Top Left: Pure White
                                    Color(hex: "F4F9FA") // Bottom Right: Very faint Cyan-White
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        // Add the Rim Light to make it look like a 3D object
                        .overlay(
                            RoundedRectangle(cornerRadius: 18, style: .continuous)
                                .strokeBorder(Color.white, lineWidth: 1) // Pure white stroke catches the light
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                        // Use the Soft Shadow you already have
                        .shadow(color: Color.black.opacity(0.05), radius: 10, x: 0, y: 5)
                    
                    // Invisible DatePicker
                    DatePicker(
                        "",
                        selection: $date,
                        displayedComponents: .hourAndMinute
                    )
                    .labelsHidden()
                    .colorMultiply(.clear)
                    .accentColor(.clear)
                }
                
                Spacer()
                
                Image(systemName: "clock")
                    .font(.title3.weight(.medium))
                    .scaleEffect(1.1)
                    .foregroundStyle(Color.gray.opacity(0.4))
            }
        }
    }
}

/// 4. Plans Input Row
struct PlansInputRow: View {
    @Binding var text: String
    @FocusState.Binding var isFocused: Bool
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) { // Tightened spacing
            FormSectionLabel(text: NSLocalizedString("input.plans", comment: "Your Plans"))
            
            ZStack(alignment: .topLeading) {
                if text.isEmpty && !isFocused {
                    Text(NSLocalizedString("input.plansPlaceholder", comment: "Placeholder"))
                        .font(.body)
                        .foregroundStyle(Color.gray.opacity(0.5)) // Heavier transparency
                        .padding(.horizontal, 16)
                        .padding(.vertical, 16)
                        .allowsHitTesting(false) // 1. Ensure placeholder doesn't block taps
                }
                
                TextField("", text: $text, axis: .vertical)
                    .focused($isFocused)
                    .font(.body)
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 16)
                    .frame(maxWidth: .infinity, minHeight: 100, alignment: .topLeading) // 2. Force TextField to fill the space
            }
            .frame(minHeight: 100, alignment: .top)
            .background(
                LinearGradient(
                    colors: [
                        Color.white, // Top Left: Pure White
                        Color(hex: "F4F9FA") // Bottom Right: Very faint Cyan-White
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            // Add the Rim Light to make it look like a 3D object
            .overlay(
                RoundedRectangle(cornerRadius: 24, style: .continuous)
                    .strokeBorder(Color.white, lineWidth: 1) // Pure white stroke catches the light
            )
            .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
            // Use the Soft Shadow you already have
            .shadow(color: Color.black.opacity(0.05), radius: 10, x: 0, y: 5)
            .onTapGesture {
                isFocused = true
            }
        }
    }
}


// MARK: - View Model (Preserved)
// Kept implementation the same as before, just inline for completeness if not separated.
// Ideally usage of StateObject in HomeView accesses the existing HomeViewModel.
// Assuming HomeViewModel is defined in HomeView.swift previously or separate file. 
// Since previous view_file showing HomeViewModel inside HomeView.swift, I must include it to avoid compile errors if I overwrite.

@MainActor
class HomeViewModel: ObservableObject {
    @Published var query: String = ""
    @Published var selectedDate: Date = Date()
    @Published var isLoading: Bool = false
    @Published var error: String?
    @Published var showItinerary: Bool = false
    @Published var createdItinerary: Itinerary?
    @Published var currentWeather: Itinerary.WeatherInfo?
    
    private let apiClient = APIClient.shared
    private let weatherService = WeatherService()
    
    func createItinerary(city: City?) async {
        guard let city = city else { return } // Allow empty query for surprise
        
        isLoading = true
        error = nil
        
        do {
            createdItinerary = try await apiClient.createItinerary(
                citySlug: city.slug,
                query: query,
                date: selectedDate,
                isPremium: true
            )
            showItinerary = true
        } catch {
            self.error = error.localizedDescription
        }
        
        isLoading = false
    }
    
    func fetchWeather(for city: City?) async {
        guard let city = city else { 
            currentWeather = nil
            return 
        }
        
        do {
            currentWeather = try await weatherService.getWeather(for: city.slug)
        } catch {
            print("Failed to fetch weather: \(error)")
            currentWeather = nil
        }
    }
}

// MARK: - City Picker Sheet
// External component now used.

#Preview {
    NavigationStack {
        HomeView()
    }
    .environmentObject(CityManager())
    .environmentObject(NetworkMonitor())
}
