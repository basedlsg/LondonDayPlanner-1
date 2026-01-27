import SwiftUI
import StoreKit

struct SubscriptionView: View {
    @StateObject private var store = StoreManager.shared
    @State private var selectedProduct: Product?
    @State private var isPurchasing = false
    @State private var showError = false
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 32) {
                    // Header
                    headerSection

                    // Features
                    featuresSection

                    // Pricing Options
                    pricingSection

                    // Subscribe Button
                    subscribeButton

                    // Restore Purchases
                    restoreButton

                    // Legal Links
                    legalSection
                }
                .padding()
            }
            .background(
                LinearGradient(
                    colors: [Color(.systemBackground), Color(.systemGray6)],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .alert(NSLocalizedString("common.error", comment: "Error"), isPresented: $showError) {
                Button(NSLocalizedString("common.ok", comment: "OK"), role: .cancel) {}
            } message: {
                Text(store.errorMessage ?? NSLocalizedString("common.unknownError", comment: "An error occurred"))
            }
            .onChange(of: store.errorMessage) { newValue in
                showError = newValue != nil
            }
            .onAppear {
                // Select annual by default
                if selectedProduct == nil {
                    selectedProduct = store.annualProduct
                }
            }
        }
    }

    // MARK: - Header Section

    private var headerSection: some View {
        VStack(spacing: 12) {
            // Premium badge
            HStack {
                Image(systemName: "crown.fill")
                    .foregroundStyle(.yellow)
                Text(NSLocalizedString("subscription.premium", comment: ""))
                    .font(.headline)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(.ultraThinMaterial, in: Capsule())

            Text(NSLocalizedString("subscription.tagline", comment: ""))
                .font(.title2)
                .fontWeight(.bold)
                .multilineTextAlignment(.center)
        }
        .padding(.top, 20)
    }

    // MARK: - Features Section

    private var featuresSection: some View {
        VStack(alignment: .leading, spacing: 16) {
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

    // MARK: - Pricing Section

    private var pricingSection: some View {
        VStack(spacing: 12) {
            ForEach(store.products, id: \.id) { product in
                ProductCard(
                    product: product,
                    isSelected: selectedProduct?.id == product.id,
                    savingsPercentage: product.id.contains("annual") ? store.annualSavingsPercentage : nil
                ) {
                    withAnimation(.spring(response: 0.3)) {
                        selectedProduct = product
                    }
                }
            }
        }
    }

    // MARK: - Subscribe Button

    private var subscribeButton: some View {
        Button {
            Task {
                await purchase()
            }
        } label: {
            HStack {
                if isPurchasing || store.isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                } else {
                    Text(NSLocalizedString("subscription.subscribe", comment: ""))
                        .fontWeight(.semibold)
                }
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(
                LinearGradient(
                    colors: [Color(hex: "17B9E6"), Color(hex: "1D8BC4")],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .foregroundColor(.white)
            .clipShape(RoundedRectangle(cornerRadius: 14))
        }
        .disabled(selectedProduct == nil || isPurchasing || store.isLoading)
        .opacity(selectedProduct == nil ? 0.6 : 1)
    }

    // MARK: - Restore Button

    private var restoreButton: some View {
        Button {
            Task {
                await store.restorePurchases()
            }
        } label: {
            Text(NSLocalizedString("subscription.restore", comment: ""))
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .disabled(store.isLoading)
    }

    // MARK: - Legal Section

    private var legalSection: some View {
        VStack(spacing: 8) {
            Text(NSLocalizedString("legal.autoRenew", comment: "Subscriptions auto-renew..."))
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            HStack(spacing: 16) {
                Link(NSLocalizedString("legal.terms", comment: "Terms of Use"), destination: URL(string: "https://example.com/terms")!)
                Link(NSLocalizedString("legal.privacy", comment: "Privacy Policy"), destination: URL(string: "https://example.com/privacy")!)
            }
            .font(.caption)
        }
        .padding(.top, 8)
    }

    // MARK: - Actions

    private func purchase() async {
        guard let product = selectedProduct else { return }

        isPurchasing = true
        defer { isPurchasing = false }

        do {
            if let _ = try await store.purchase(product) {
                // Purchase successful - dismiss the view
                dismiss()
            }
        } catch {
            store.errorMessage = error.localizedDescription
        }
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

// MARK: - Product Card

struct ProductCard: View {
    let product: Product
    let isSelected: Bool
    let savingsPercentage: Int?
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack {
                // Selection indicator
                ZStack {
                    Circle()
                        .stroke(isSelected ? Color(hex: "17B9E6") : Color.gray.opacity(0.3), lineWidth: 2)
                        .frame(width: 24, height: 24)

                    if isSelected {
                        Circle()
                            .fill(Color(hex: "17B9E6"))
                            .frame(width: 14, height: 14)
                    }
                }

                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(product.displayName)
                            .font(.headline)

                        if let savings = savingsPercentage, savings > 0 {
                            Text(String(format: NSLocalizedString("subscription.savings", comment: "Save %d%%"), savings))
                                .font(.caption)
                                .fontWeight(.semibold)
                                .foregroundStyle(.white)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 2)
                                .background(Color.green, in: Capsule())
                        }
                    }

                    Text(product.description)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                VStack(alignment: .trailing) {
                    Text(product.displayPrice)
                        .font(.title3)
                        .fontWeight(.bold)

                    if product.id.contains("monthly") {
                        Text(NSLocalizedString("subscription.perMonth", comment: "/month"))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    } else {
                        Text(NSLocalizedString("subscription.perYear", comment: "/year"))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(isSelected ? Color(hex: "17B9E6").opacity(0.1) : Color(.systemBackground))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isSelected ? Color(hex: "17B9E6") : Color.gray.opacity(0.2), lineWidth: isSelected ? 2 : 1)
            )
        }
        .buttonStyle(.plain)
    }
}



// MARK: - Preview

#Preview {
    SubscriptionView()
}
