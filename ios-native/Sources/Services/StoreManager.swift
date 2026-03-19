import Foundation
import StoreKit

/// Product identifiers for subscription plans.
enum SubscriptionProduct: String, CaseIterable {
    case monthly = "com.londonplanner.premium.monthly"
    case annual = "com.londonplanner.premium.annual"
}

/// Manages subscription entitlement state.
///
/// Product loading and purchasing are handled by Apple's `SubscriptionStoreView`.
/// This class only tracks whether the user currently has an active subscription.
@MainActor
class StoreManager: ObservableObject {
    static let shared = StoreManager()

    @Published private(set) var purchasedProductIDs: Set<String> = []
    @Published private(set) var isPremium: Bool = false

    private var updateListenerTask: Task<Void, Error>?

    init(autoBootstrap: Bool = true) {
        if autoBootstrap {
            updateListenerTask = listenForTransactions()
            Task { [weak self] in
                await self?.updatePurchasedProducts()
            }
        }
    }

    deinit {
        updateListenerTask?.cancel()
    }

    // MARK: - Entitlement Checking

    /// Update the set of purchased products based on current entitlements.
    func updatePurchasedProducts() async {
        var purchased: Set<String> = []

        for await result in Transaction.currentEntitlements {
            if case .verified(let transaction) = result, transaction.revocationDate == nil {
                purchased.insert(transaction.productID)
            }
        }

        purchasedProductIDs = purchased
        isPremium = !purchased.isEmpty

        print("StoreManager: Updated entitlements - isPremium: \(isPremium)")
    }

    /// Check if a specific product is purchased.
    func isPurchased(_ productID: String) -> Bool {
        purchasedProductIDs.contains(productID)
    }

    // MARK: - Restore Purchases

    /// Restore previous purchases by syncing with the App Store.
    func restorePurchases() async {
        do {
            try await AppStore.sync()
            await updatePurchasedProducts()
            print("StoreManager: Purchases restored successfully")
        } catch {
            print("StoreManager: Failed to restore purchases: \(error)")
        }
    }

    // MARK: - Transaction Listening

    /// Listen for transaction updates (renewals, revocations, etc.)
    private func listenForTransactions() -> Task<Void, Error> {
        Task.detached {
            for await result in Transaction.updates {
                do {
                    let transaction = try self.checkVerified(result)
                    await self.updatePurchasedProducts()
                    await transaction.finish()
                    print("StoreManager: Transaction update processed for \(transaction.productID)")
                } catch {
                    print("StoreManager: Transaction update failed verification: \(error)")
                }
            }
        }
    }

    // MARK: - Verification

    /// Verify a transaction result.
    nonisolated private func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified(_, let error):
            throw StoreError.failedVerification(error)
        case .verified(let safe):
            return safe
        }
    }

    // MARK: - Subscription Info

    /// Get renewal date for the current subscription.
    func getRenewalDate() async -> Date? {
        for await result in Transaction.currentEntitlements {
            if case .verified(let transaction) = result {
                return transaction.expirationDate
            }
        }
        return nil
    }
}

// MARK: - Errors

enum StoreError: LocalizedError {
    case failedVerification(Error)

    var errorDescription: String? {
        switch self {
        case .failedVerification(let error):
            return "Transaction verification failed: \(error.localizedDescription)"
        }
    }
}
