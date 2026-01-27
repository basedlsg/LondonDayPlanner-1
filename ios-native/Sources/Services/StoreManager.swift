import Foundation
import StoreKit

/// Product identifiers for subscription plans
enum SubscriptionProduct: String, CaseIterable {
    case monthly = "com.londonplanner.premium.monthly"
    case annual = "com.londonplanner.premium.annual"

    var displayName: String {
        switch self {
        case .monthly: return "Monthly"
        case .annual: return "Annual"
        }
    }
}

/// Manages in-app purchases and subscriptions using StoreKit 2
@MainActor
class StoreManager: ObservableObject {
    static let shared = StoreManager()

    /// Available products from the App Store
    @Published private(set) var products: [Product] = []

    /// Set of purchased product IDs
    @Published private(set) var purchasedProductIDs: Set<String> = []

    /// Whether the user has an active premium subscription
    @Published private(set) var isPremium: Bool = false

    /// Loading state
    @Published private(set) var isLoading: Bool = false

    /// Error message for UI display
    @Published var errorMessage: String?

    /// Task handle for transaction listener
    private var updateListenerTask: Task<Void, Error>?

    private init() {
        // Start listening for transactions
        updateListenerTask = listenForTransactions()

        // Load products and check entitlements
        Task {
            await loadProducts()
            await updatePurchasedProducts()
        }
    }

    deinit {
        updateListenerTask?.cancel()
    }

    // MARK: - Product Loading

    /// Load products from the App Store
    func loadProducts() async {
        isLoading = true
        defer { isLoading = false }

        do {
            let productIDs = SubscriptionProduct.allCases.map { $0.rawValue }
            let storeProducts = try await Product.products(for: productIDs)

            // Sort by price (monthly first, then annual)
            products = storeProducts.sorted { $0.price < $1.price }

            print("StoreManager: Loaded \(products.count) products")
            for product in products {
                print("  - \(product.id): \(product.displayPrice)")
            }
        } catch {
            print("StoreManager: Failed to load products: \(error)")
            errorMessage = "Failed to load subscription options. Please try again."
        }
    }

    // MARK: - Purchase

    /// Purchase a product
    /// - Parameter product: The product to purchase
    /// - Returns: The transaction if successful, nil otherwise
    func purchase(_ product: Product) async throws -> Transaction? {
        isLoading = true
        defer { isLoading = false }

        let result = try await product.purchase()

        switch result {
        case .success(let verification):
            // Check if the transaction is verified
            let transaction = try checkVerified(verification)

            // Update the purchased products
            await updatePurchasedProducts()

            // Finish the transaction
            await transaction.finish()

            print("StoreManager: Successfully purchased \(product.id)")
            return transaction

        case .pending:
            // Transaction is pending (e.g., Ask to Buy)
            print("StoreManager: Purchase pending for \(product.id)")
            return nil

        case .userCancelled:
            // User cancelled the purchase
            print("StoreManager: User cancelled purchase for \(product.id)")
            return nil

        @unknown default:
            print("StoreManager: Unknown purchase result for \(product.id)")
            return nil
        }
    }

    // MARK: - Restore Purchases

    /// Restore previous purchases
    func restorePurchases() async {
        isLoading = true
        defer { isLoading = false }

        do {
            // Sync with the App Store
            try await AppStore.sync()

            // Update purchased products
            await updatePurchasedProducts()

            print("StoreManager: Purchases restored successfully")
        } catch {
            print("StoreManager: Failed to restore purchases: \(error)")
            errorMessage = "Failed to restore purchases. Please try again."
        }
    }

    // MARK: - Entitlement Checking

    /// Update the set of purchased products based on current entitlements
    func updatePurchasedProducts() async {
        var purchased: Set<String> = []

        // Iterate through all current entitlements
        for await result in Transaction.currentEntitlements {
            if case .verified(let transaction) = result {
                // Check if this is a subscription that hasn't expired
                if transaction.revocationDate == nil {
                    purchased.insert(transaction.productID)
                }
            }
        }

        purchasedProductIDs = purchased
        isPremium = !purchased.isEmpty

        print("StoreManager: Updated entitlements - isPremium: \(isPremium)")
    }

    /// Check if a specific product is purchased
    func isPurchased(_ productID: String) -> Bool {
        return purchasedProductIDs.contains(productID)
    }

    // MARK: - Transaction Listening

    /// Listen for transaction updates
    private func listenForTransactions() -> Task<Void, Error> {
        return Task.detached {
            // Iterate through any transactions that don't come from a direct call to `purchase()`
            for await result in Transaction.updates {
                do {
                    let transaction = try await self.checkVerified(result)

                    // Update the purchased products on the main actor
                    await self.updatePurchasedProducts()

                    // Always finish the transaction
                    await transaction.finish()

                    print("StoreManager: Transaction update processed for \(transaction.productID)")
                } catch {
                    print("StoreManager: Transaction update failed verification: \(error)")
                }
            }
        }
    }

    // MARK: - Verification

    /// Verify a transaction result
    private func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified(_, let error):
            throw StoreError.failedVerification(error)
        case .verified(let safe):
            return safe
        }
    }

    // MARK: - Subscription Info

    /// Get the subscription status for a product
    func subscriptionStatus(for productID: String) async -> Product.SubscriptionInfo.Status? {
        guard let product = products.first(where: { $0.id == productID }),
              let subscription = product.subscription else {
            return nil
        }

        do {
            let statuses = try await subscription.status
            return statuses.first
        } catch {
            print("StoreManager: Failed to get subscription status: \(error)")
            return nil
        }
    }

    /// Get renewal date for the current subscription
    func getRenewalDate() async -> Date? {
        for await result in Transaction.currentEntitlements {
            if case .verified(let transaction) = result {
                return transaction.expirationDate
            }
        }
        return nil
    }

    // MARK: - Helper Methods

    /// Get the monthly product
    var monthlyProduct: Product? {
        products.first { $0.id == SubscriptionProduct.monthly.rawValue }
    }

    /// Get the annual product
    var annualProduct: Product? {
        products.first { $0.id == SubscriptionProduct.annual.rawValue }
    }

    /// Calculate savings percentage for annual vs monthly
    var annualSavingsPercentage: Int {
        guard let monthly = monthlyProduct,
              let annual = annualProduct else {
            return 0
        }

        let monthlyAnnualized = monthly.price * 12
        let savings = (monthlyAnnualized - annual.price) / monthlyAnnualized * 100
        return Int(NSDecimalNumber(decimal: savings).doubleValue.rounded())
    }
}

// MARK: - Errors

enum StoreError: LocalizedError {
    case failedVerification(Error)
    case productNotFound
    case purchaseFailed(Error)

    var errorDescription: String? {
        switch self {
        case .failedVerification(let error):
            return "Transaction verification failed: \(error.localizedDescription)"
        case .productNotFound:
            return "The requested product was not found."
        case .purchaseFailed(let error):
            return "Purchase failed: \(error.localizedDescription)"
        }
    }
}
