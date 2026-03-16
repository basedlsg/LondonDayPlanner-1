import SwiftUI
import StoreKit

/// Subscription paywall using Apple's native SubscriptionStoreView.
/// Uses the subscription group ID from App Store Connect for reliable product loading.
struct SubscriptionView: View {
    @StateObject private var store = StoreManager.shared
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        SubscriptionStoreView(groupID: "21914011") {
            // Custom marketing header
            VStack(spacing: 16) {
                HStack {
                    Image(systemName: "crown.fill")
                        .foregroundStyle(.yellow)
                    Text(NSLocalizedString("subscription.premium", comment: "Premium"))
                        .font(.headline)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(.ultraThinMaterial, in: Capsule())

                Text(NSLocalizedString("subscription.tagline", comment: "Unlock your perfect day"))
                    .font(.title2)
                    .fontWeight(.bold)
                    .multilineTextAlignment(.center)

                VStack(alignment: .leading, spacing: 12) {
                    FeatureRow(
                        icon: "brain.head.profile",
                        iconColor: .purple,
                        title: NSLocalizedString("subscription.features.memory", comment: ""),
                        description: NSLocalizedString("subscription.features.memoryDescription", comment: "")
                    )

                    FeatureRow(
                        icon: "sparkles",
                        iconColor: .orange,
                        title: NSLocalizedString("subscription.features.betterModel", comment: ""),
                        description: NSLocalizedString("subscription.features.betterModelDescription", comment: "")
                    )

                    FeatureRow(
                        icon: "bolt.fill",
                        iconColor: .blue,
                        title: NSLocalizedString("subscription.features.priority", comment: ""),
                        description: NSLocalizedString("subscription.features.priorityDescription", comment: "")
                    )
                }
                .padding()
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16))
            }
            .padding()
        }
        .storeButton(.visible, for: .restorePurchases)
        .subscriptionStoreControlStyle(.prominentPicker)
        .subscriptionStoreButtonLabel(.multiline)
        .onInAppPurchaseCompletion { _, result in
            switch result {
            case .success(.success(_)):
                // Purchase succeeded — refresh entitlements and dismiss
                await store.updatePurchasedProducts()
                dismiss()
            default:
                break
            }
        }
        .accessibilityIdentifier("subscription.view")
    }
}

// MARK: - Feature Row

struct FeatureRow: View {
    let icon: String
    let iconColor: Color
    let title: String
    let description: String

    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(iconColor)
                .frame(width: 32)

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.headline)
                Text(description)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

#Preview {
    SubscriptionView()
}
