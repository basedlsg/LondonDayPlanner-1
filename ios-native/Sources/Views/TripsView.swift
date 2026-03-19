import SwiftUI

/// View for browsing saved trips
struct TripsView: View {
    @State private var trips: [Trip] = []
    @State private var isLoading = false
    
    var body: some View {
        ZStack {
            // 1. Atmospheric Ambient Background
            HomeAmbientBackground()
            
            VStack(spacing: 0) {
                // Centered Header
                Text(NSLocalizedString("trips.title", comment: "My Trips"))
                    .font(DesignTokens.Fonts.rozhaOne(size: 48))
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
                    .padding(.top, 40)
                    .padding(.bottom, DesignTokens.Spacing.lg)
                
                if trips.isEmpty && !isLoading {
                    Spacer()
                    emptyState
                    Spacer()
                } else {
                    ScrollView {
                        LazyVStack(spacing: DesignTokens.Spacing.md) {
                            ForEach(trips) { trip in
                                TripCard(trip: trip)
                            }
                        }
                        .padding()
                    }
                }
            }
        }
        .toolbar(.hidden, for: .navigationBar)
    }
    
    private var emptyState: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Image(systemName: "map")
                .font(.system(size: 64))
                .foregroundStyle(
                    LinearGradient(
                        colors: [.accentPink.opacity(0.5), .accentBlue.opacity(0.5)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
            
            Text(NSLocalizedString("trips.noTrips", comment: "No trips yet"))
                .font(.title2)
                .foregroundStyle(DesignTokens.Colors.textPrimary)

            Text(NSLocalizedString("trips.getStarted", comment: "Plan your first day"))
                .font(.subheadline)
                .foregroundStyle(DesignTokens.Colors.textSecondary)
        }
    }
}

struct TripCard: View {
    let trip: Trip
    
    var body: some View {
        GlassCard(variant: .frosted) {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                HStack {
                    Text(trip.title)
                        .font(.headline)
                        .foregroundStyle(DesignTokens.Colors.textPrimary)
                    Spacer()
                    Text(trip.city)
                        .font(.caption)
                        .foregroundStyle(Color.accentBlue)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(.ultraThinMaterial)
                        .clipShape(Capsule())
                }
                
                if let description = trip.description {
                    Text(description)
                        .font(.subheadline)
                        .foregroundStyle(DesignTokens.Colors.textSecondary)
                        .lineLimit(2)
                }
                
                HStack {
                    Label(String(format: NSLocalizedString("trips.days", comment: "X days"), trip.totalDays), systemImage: "calendar")
                    Spacer()
                    Text(formatDate(trip.startDate))
                }
                .font(.caption)
                .foregroundStyle(DesignTokens.Colors.textSecondary)
            }
            .padding(DesignTokens.Spacing.md)
        }
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        return formatter.string(from: date)
    }
}

#Preview {
    NavigationStack {
        TripsView()
    }
}
