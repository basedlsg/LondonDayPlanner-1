import XCTest
import StoreKitTest
import Foundation

@MainActor
final class PaywallUITests: XCTestCase {
    private var app: XCUIApplication!
    private var storeKitSession: SKTestSession!

    override func setUpWithError() throws {
        continueAfterFailure = false

        // SwiftPM test bundles do not provide a UI test host app by default.
        guard ProcessInfo.processInfo.environment["XCInjectBundleInto"] != nil else {
            throw XCTSkip("PaywallUITests require a configured UI test host target.")
        }

        let repoConfigURL = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()
            .appendingPathComponent("Fixtures")
            .appendingPathComponent("PlanYourPerfectDay.storekit")

        let configURL =
            Bundle.module.url(forResource: "PlanYourPerfectDay", withExtension: "storekit")
            ?? Bundle.module.url(forResource: "PlanYourPerfectDay", withExtension: "storekit", subdirectory: "Fixtures")
            ?? (FileManager.default.fileExists(atPath: repoConfigURL.path) ? repoConfigURL : nil)

        guard let configURL else {
            throw XCTSkip("StoreKit test configuration not found in test bundle.")
        }

        storeKitSession = try SKTestSession(contentsOf: configURL)
        storeKitSession.disableDialogs = true
        storeKitSession.clearTransactions()
        storeKitSession.resetToDefaultState()

        app = XCUIApplication()
    }

    override func tearDownWithError() throws {
        app = nil
        storeKitSession = nil
    }

    func testPaywallDegradedStateRemainsNonBlocking() throws {
        launchApp(arguments: [
            "--uitesting",
            "--fast-paywall-retries",
            "--simulate-iap-load-failure-always"
        ])

        openSubscriptionFromSettings()

        let degradedStatus = app.staticTexts["subscription.degradedStatus"]
        XCTAssertTrue(degradedStatus.waitForExistence(timeout: 4), "Expected neutral degraded status when plans cannot be loaded")

        let retryButton = app.buttons["subscription.retryButton"]
        XCTAssertTrue(retryButton.exists, "Retry action should remain available in degraded state")

        let restoreButton = app.buttons["subscription.restoreButton"]
        XCTAssertTrue(restoreButton.exists, "Restore should always be visible")
        XCTAssertTrue(restoreButton.isEnabled, "Restore should remain enabled in degraded state")

        let continueFreeButton = app.buttons["subscription.continueFreeButton"]
        XCTAssertTrue(continueFreeButton.exists, "Continue with Free path must always be available")
        continueFreeButton.tap()

        XCTAssertTrue(app.buttons["settings.subscriptionRow"].waitForExistence(timeout: 3), "Expected to return to Settings after Continue with Free")
        XCTAssertFalse(app.alerts.firstMatch.exists, "Paywall load issues must not present blocking alerts")
    }

    func testTransientLoadFailureRecoversWithoutBlockingErrorModal() throws {
        launchApp(arguments: [
            "--uitesting",
            "--fast-paywall-retries",
            "--simulate-iap-load-failure-once"
        ])

        openSubscriptionFromSettings()

        let monthlyOption = app.buttons["subscription.option.com.londonplanner.premium.monthly"]
        let annualOption = app.buttons["subscription.option.com.londonplanner.premium.annual"]
        let plansLoaded = monthlyOption.waitForExistence(timeout: 4) || annualOption.waitForExistence(timeout: 4)
        XCTAssertTrue(plansLoaded, "Plans should recover during retry window after a transient failure")

        let subscribeButton = app.buttons["subscription.subscribeButton"]
        XCTAssertTrue(subscribeButton.exists, "Subscribe button missing")
        XCTAssertTrue(subscribeButton.isEnabled, "Subscribe should be enabled once plans load")

        let continueFreeButton = app.buttons["subscription.continueFreeButton"]
        XCTAssertTrue(continueFreeButton.exists, "Continue with Free should remain visible after recovery")
        XCTAssertFalse(app.alerts.firstMatch.exists, "No blocking error modal should be shown for product-load retries")
    }

    private func openSubscriptionFromSettings() {
        XCTAssertTrue(app.tabBars.buttons["Settings"].waitForExistence(timeout: 10), "Settings tab not visible")
        app.tabBars.buttons["Settings"].tap()

        let subscriptionRow = app.buttons["settings.subscriptionRow"]
        XCTAssertTrue(subscriptionRow.waitForExistence(timeout: 10), "Subscription row not visible")
        subscriptionRow.tap()

        let paywall = app.otherElements["subscription.view"]
        XCTAssertTrue(paywall.waitForExistence(timeout: 10), "Paywall did not open")
    }

    private func launchApp(arguments: [String]) {
        app.launchArguments = arguments
        app.launch()
    }
}
