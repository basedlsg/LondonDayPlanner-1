import XCTest
@testable import PlanYourPerfectDay

@MainActor
final class StoreManagerTests: XCTestCase {

    func testInitialStateIsNotPremium() async {
        let store = StoreManager(autoBootstrap: false)

        XCTAssertFalse(store.isPremium)
        XCTAssertTrue(store.purchasedProductIDs.isEmpty)
    }

    func testIsPurchasedReturnsFalseForUnknownProduct() async {
        let store = StoreManager(autoBootstrap: false)

        XCTAssertFalse(store.isPurchased("com.example.nonexistent"))
    }

    func testIsPurchasedMatchesProductIDs() async {
        let store = StoreManager(autoBootstrap: false)

        // After updatePurchasedProducts in a clean environment, nothing is purchased
        await store.updatePurchasedProducts()

        XCTAssertFalse(store.isPurchased(SubscriptionProduct.monthly.rawValue))
        XCTAssertFalse(store.isPurchased(SubscriptionProduct.annual.rawValue))
        XCTAssertFalse(store.isPremium)
    }

    func testUpdatePurchasedProductsSetsIsPremiumFalseWhenEmpty() async {
        let store = StoreManager(autoBootstrap: false)

        await store.updatePurchasedProducts()

        XCTAssertFalse(store.isPremium)
        XCTAssertTrue(store.purchasedProductIDs.isEmpty)
    }

    func testRestorePurchasesDoesNotCrash() async {
        let store = StoreManager(autoBootstrap: false)

        // Just verify it completes without throwing
        await store.restorePurchases()
    }

    func testSubscriptionProductRawValues() {
        XCTAssertEqual(SubscriptionProduct.monthly.rawValue, "com.londonplanner.premium.monthly")
        XCTAssertEqual(SubscriptionProduct.annual.rawValue, "com.londonplanner.premium.annual")
    }

    func testSuccessfulPurchaseGrantsPremiumAccess() async throws {
        // Find the StoreKit config file in the test bundle
        let configURL = Bundle.module.url(forResource: "PlanYourPerfectDay", withExtension: "storekit", subdirectory: "Fixtures")
        XCTAssertNotNil(configURL, "PlanYourPerfectDay.storekit not found in Fixtures")
        guard let configURL = configURL else { return }

        // Initialize Apple's automated test session
        let session = try SKTestSession(contentsOf: configURL)
        session.disableDialogs = true
        session.clearTransactions()
        session.resetToDefaultState()

        let store = StoreManager(autoBootstrap: false)

        // Baseline: Not premium initially
        await store.updatePurchasedProducts()
        XCTAssertFalse(store.isPremium, "User should not be premium before purchase")

        // Action: Simulate a successful purchase on Apple's servers
        try await session.buyProduct(identifier: "com.londonplanner.premium.monthly")

        // The Transaction listener would normally pick this up, but for the test we manually trigger the entitlement sync
        await store.updatePurchasedProducts()

        // Verification: The app MUST securely unlock premium access
        XCTAssertTrue(store.isPremium, "User should be premium after a successful purchase")
        XCTAssertTrue(store.purchasedProductIDs.contains("com.londonplanner.premium.monthly"), "The exact product ID should be recorded")
    }
}
