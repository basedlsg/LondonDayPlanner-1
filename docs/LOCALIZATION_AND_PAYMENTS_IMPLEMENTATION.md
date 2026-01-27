# Localization & Payments Implementation Guide

This document provides a complete guide to implementing internationalization (i18n) and subscription payments for the London Day Planner app across Web, iOS, and Android platforms.

---

## Table of Contents

1. [Overview](#overview)
2. [Pricing Structure](#pricing-structure)
3. [Web Client (React + i18next)](#web-client-react--i18next)
4. [iOS Native (Swift + StoreKit 2)](#ios-native-swift--storekit-2)
5. [Android Native (Kotlin + Google Play Billing)](#android-native-kotlin--google-play-billing)
6. [Backend (TypeScript)](#backend-typescript)
7. [App Store Setup](#app-store-setup)
8. [Testing](#testing)

---

## Overview

### Scope
- **Languages**: English (default), Traditional Chinese (zh-HK) for Hong Kong
- **Regions**: UK, US, Hong Kong (China mainland skipped initially)
- **Platforms**: Web, iOS (App Store), Android (Google Play)

### Premium Features
1. **Memory/Personalization** - AI learns user preferences over time
2. **Better Model** - Always uses Gemini 1.5 Pro (vs Flash for free users)
3. **Priority Processing** - Faster response times

---

## Pricing Structure

| Plan | USD | GBP | HKD | Savings |
|------|-----|-----|-----|---------|
| Monthly | $8/mo | £6.50/mo | HK$62/mo | - |
| Annual | $60/yr | £48/yr | HK$468/yr | ~37% |

---

## Web Client (React + i18next)

### Step 1: Install Dependencies

```bash
cd client
npm install i18next react-i18next i18next-browser-languagedetector
```

### Step 2: Create Directory Structure

```
client/src/i18n/
├── index.ts
├── locales/
│   ├── en/
│   │   └── translation.json
│   └── zh-HK/
│       └── translation.json
```

### Step 3: Create i18n Configuration

**File: `client/src/i18n/index.ts`**

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslations from './locales/en/translation.json';
import zhHKTranslations from './locales/zh-HK/translation.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      'zh-HK': { translation: zhHKTranslations }
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'zh-HK'],
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage']
    }
  });

export default i18n;

export const supportedLanguages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'zh-HK', name: 'Traditional Chinese', nativeName: '繁體中文' }
] as const;

export type SupportedLanguage = typeof supportedLanguages[number]['code'];
```

### Step 4: Create Translation Files

**File: `client/src/i18n/locales/en/translation.json`**

```json
{
  "app": {
    "title": "Plan Your Perfect Day",
    "tagline": "AI-powered itineraries for your city"
  },
  "input": {
    "placeholder": "Where would you like to go?",
    "planButton": "Plan My Day",
    "examples": {
      "simple": "Coffee shop in Shoreditch",
      "detailed": "Quiet cafe with wifi, working until 6PM",
      "complex": "Morning coffee -- lunch in Mayfair -- evening drinks"
    },
    "exampleLabels": {
      "simple": "Quick search",
      "detailed": "With context",
      "complex": "Full day"
    }
  },
  "itinerary": {
    "title": "Your Itinerary",
    "openNow": "Open now",
    "closed": "Closed",
    "directions": "Get directions",
    "alternatives": "See alternatives",
    "rating": "{{rating}} ({{count}} reviews)",
    "whyRecommended": "Why we recommend this",
    "travelTime": "{{minutes}} min walk",
    "arriveBy": "Arrive by {{time}}",
    "stayUntil": "Stay until {{time}}"
  },
  "cities": {
    "london": "London",
    "new-york": "New York",
    "paris": "Paris",
    "tokyo": "Tokyo",
    "hong-kong": "Hong Kong"
  },
  "settings": {
    "title": "Settings",
    "language": "Language",
    "city": "Default City",
    "theme": "Theme",
    "themes": {
      "light": "Light",
      "dark": "Dark",
      "system": "System"
    },
    "subscription": "Subscription",
    "manageSubscription": "Manage Subscription"
  },
  "subscription": {
    "premium": "Premium",
    "tagline": "Unlock personalized recommendations",
    "free": "Free",
    "monthly": "Monthly",
    "annual": "Annual",
    "perMonth": "/month",
    "perYear": "/year",
    "savings": "Save {{percent}}%",
    "currentPlan": "Current Plan",
    "features": {
      "memory": "Personalized recommendations",
      "memoryDescription": "The AI learns your preferences over time",
      "betterModel": "Enhanced AI responses",
      "betterModelDescription": "Access to our most capable AI model",
      "priority": "Priority processing",
      "priorityDescription": "Faster response times"
    },
    "subscribe": "Subscribe",
    "restore": "Restore Purchase"
  },
  "errors": {
    "generic": "Something went wrong. Please try again.",
    "network": "Unable to connect. Check your internet connection.",
    "noResults": "No results found. Try a different search."
  },
  "loading": {
    "planning": "Planning your perfect day...",
    "searching": "Searching for venues...",
    "optimizing": "Optimizing your itinerary..."
  },
  "common": {
    "back": "Back",
    "next": "Next",
    "done": "Done",
    "cancel": "Cancel",
    "save": "Save",
    "share": "Share",
    "tryAgain": "Try Again"
  }
}
```

**File: `client/src/i18n/locales/zh-HK/translation.json`**

```json
{
  "app": {
    "title": "計劃你的完美一天",
    "tagline": "AI智能行程規劃"
  },
  "input": {
    "placeholder": "你想去哪裡？",
    "planButton": "規劃行程",
    "examples": {
      "simple": "中環咖啡店",
      "detailed": "安靜有WiFi的咖啡廳，工作到下午6點",
      "complex": "早上飲咖啡 -- 中環午餐 -- 晚上去酒吧"
    },
    "exampleLabels": {
      "simple": "快速搜尋",
      "detailed": "詳細搜尋",
      "complex": "全日行程"
    }
  },
  "itinerary": {
    "title": "你的行程",
    "openNow": "營業中",
    "closed": "已關閉",
    "directions": "導航",
    "alternatives": "其他選擇",
    "rating": "{{rating}} ({{count}} 則評價)",
    "whyRecommended": "推薦原因",
    "travelTime": "步行 {{minutes}} 分鐘",
    "arriveBy": "{{time}} 前到達",
    "stayUntil": "停留至 {{time}}"
  },
  "cities": {
    "london": "倫敦",
    "new-york": "紐約",
    "paris": "巴黎",
    "tokyo": "東京",
    "hong-kong": "香港"
  },
  "settings": {
    "title": "設定",
    "language": "語言",
    "city": "預設城市",
    "theme": "主題",
    "themes": {
      "light": "淺色",
      "dark": "深色",
      "system": "跟隨系統"
    },
    "subscription": "訂閱",
    "manageSubscription": "管理訂閱"
  },
  "subscription": {
    "premium": "高級版",
    "tagline": "解鎖個人化推薦功能",
    "free": "免費版",
    "monthly": "月費",
    "annual": "年費",
    "perMonth": "/月",
    "perYear": "/年",
    "savings": "節省 {{percent}}%",
    "currentPlan": "目前方案",
    "features": {
      "memory": "個人化推薦",
      "memoryDescription": "AI會學習你的偏好",
      "betterModel": "進階AI回應",
      "betterModelDescription": "使用最強大的AI模型",
      "priority": "優先處理",
      "priorityDescription": "更快的回應速度"
    },
    "subscribe": "訂閱",
    "restore": "恢復購買"
  },
  "errors": {
    "generic": "發生錯誤，請再試一次。",
    "network": "無法連接網絡，請檢查你的網絡連接。",
    "noResults": "找不到結果，請嘗試其他搜尋。"
  },
  "loading": {
    "planning": "正在規劃你的完美一天...",
    "searching": "正在搜尋場所...",
    "optimizing": "正在優化行程..."
  },
  "common": {
    "back": "返回",
    "next": "下一步",
    "done": "完成",
    "cancel": "取消",
    "save": "儲存",
    "share": "分享",
    "tryAgain": "重試"
  }
}
```

### Step 5: Import i18n in Main Entry Point

**File: `client/src/main.tsx`**

Add this import BEFORE the App import:

```typescript
// Import i18n configuration (must be imported before App)
import './i18n';
```

### Step 6: Create Language Switcher Component

**File: `client/src/components/LanguageSwitcher.tsx`**

```typescript
import React from 'react';
import { useTranslation } from 'react-i18next';
import { supportedLanguages } from '../i18n';
import { Globe } from 'lucide-react';

interface LanguageSwitcherProps {
  variant?: 'button' | 'dropdown';
  className?: string;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'button',
  className = ''
}) => {
  const { i18n } = useTranslation();

  const currentLanguage = supportedLanguages.find(
    lang => lang.code === i18n.language
  ) || supportedLanguages[0];

  const toggleLanguage = () => {
    const currentIndex = supportedLanguages.findIndex(
      lang => lang.code === i18n.language
    );
    const nextIndex = (currentIndex + 1) % supportedLanguages.length;
    i18n.changeLanguage(supportedLanguages[nextIndex].code);
  };

  if (variant === 'button') {
    return (
      <button
        onClick={toggleLanguage}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg ${className}`}
      >
        <Globe className="h-4 w-4" />
        <span className="text-sm font-medium">{currentLanguage.nativeName}</span>
      </button>
    );
  }

  // Dropdown variant
  return (
    <select
      value={i18n.language}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
      className={`bg-white border rounded-lg px-4 py-2 ${className}`}
    >
      {supportedLanguages.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.nativeName}
        </option>
      ))}
    </select>
  );
};

export default LanguageSwitcher;
```

### Step 7: Use Translations in Components

**Example usage in any component:**

```typescript
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t, i18n } = useTranslation();
  const isZhHK = i18n.language === 'zh-HK';

  return (
    <div>
      <h1>{t('app.title')}</h1>
      <p>{t('app.tagline')}</p>

      {/* With interpolation */}
      <p>{t('itinerary.rating', { rating: 4.5, count: 123 })}</p>

      {/* Conditional based on language */}
      <span>{isZhHK ? '營業中' : 'Open'}</span>
    </div>
  );
};
```

---

## iOS Native (Swift + StoreKit 2)

### Step 1: Create StoreManager

**File: `ios-native/Sources/Services/StoreManager.swift`**

```swift
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
        } catch {
            print("StoreManager: Failed to load products: \(error)")
            errorMessage = "Failed to load subscription options. Please try again."
        }
    }

    // MARK: - Purchase

    /// Purchase a product
    func purchase(_ product: Product) async throws -> Transaction? {
        isLoading = true
        defer { isLoading = false }

        let result = try await product.purchase()

        switch result {
        case .success(let verification):
            let transaction = try checkVerified(verification)
            await updatePurchasedProducts()
            await transaction.finish()
            return transaction

        case .pending:
            return nil

        case .userCancelled:
            return nil

        @unknown default:
            return nil
        }
    }

    // MARK: - Restore Purchases

    /// Restore previous purchases
    func restorePurchases() async {
        isLoading = true
        defer { isLoading = false }

        do {
            try await AppStore.sync()
            await updatePurchasedProducts()
        } catch {
            errorMessage = "Failed to restore purchases. Please try again."
        }
    }

    // MARK: - Entitlement Checking

    /// Update the set of purchased products based on current entitlements
    func updatePurchasedProducts() async {
        var purchased: Set<String> = []

        for await result in Transaction.currentEntitlements {
            if case .verified(let transaction) = result {
                if transaction.revocationDate == nil {
                    purchased.insert(transaction.productID)
                }
            }
        }

        purchasedProductIDs = purchased
        isPremium = !purchased.isEmpty
    }

    // MARK: - Transaction Listening

    private func listenForTransactions() -> Task<Void, Error> {
        return Task.detached {
            for await result in Transaction.updates {
                do {
                    let transaction = try await self.checkVerified(result)
                    await self.updatePurchasedProducts()
                    await transaction.finish()
                } catch {
                    print("StoreManager: Transaction update failed: \(error)")
                }
            }
        }
    }

    // MARK: - Verification

    private func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified(_, let error):
            throw StoreError.failedVerification(error)
        case .verified(let safe):
            return safe
        }
    }

    // MARK: - Helper Methods

    var monthlyProduct: Product? {
        products.first { $0.id == SubscriptionProduct.monthly.rawValue }
    }

    var annualProduct: Product? {
        products.first { $0.id == SubscriptionProduct.annual.rawValue }
    }

    var annualSavingsPercentage: Int {
        guard let monthly = monthlyProduct,
              let annual = annualProduct else { return 0 }

        let monthlyAnnualized = monthly.price * 12
        let savings = (monthlyAnnualized - annual.price) / monthlyAnnualized * 100
        return Int(savings.rounded())
    }
}

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
```

### Step 2: Create SubscriptionView

**File: `ios-native/Sources/Views/SubscriptionView.swift`**

```swift
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
                    headerSection
                    featuresSection
                    pricingSection
                    subscribeButton
                    restoreButton
                    legalSection
                }
                .padding()
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button { dismiss() } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .alert("Error", isPresented: $showError) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(store.errorMessage ?? "An error occurred")
            }
            .onAppear {
                if selectedProduct == nil {
                    selectedProduct = store.annualProduct
                }
            }
        }
    }

    private var headerSection: some View {
        VStack(spacing: 12) {
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
    }

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

    private var subscribeButton: some View {
        Button {
            Task { await purchase() }
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
            .background(Color(hex: "17B9E6"))
            .foregroundColor(.white)
            .clipShape(RoundedRectangle(cornerRadius: 14))
        }
        .disabled(selectedProduct == nil || isPurchasing || store.isLoading)
    }

    private var restoreButton: some View {
        Button {
            Task { await store.restorePurchases() }
        } label: {
            Text(NSLocalizedString("subscription.restore", comment: ""))
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }

    private var legalSection: some View {
        VStack(spacing: 8) {
            Text("Subscriptions auto-renew unless cancelled at least 24 hours before the end of the current period.")
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            HStack(spacing: 16) {
                Link("Terms of Use", destination: URL(string: "https://example.com/terms")!)
                Link("Privacy Policy", destination: URL(string: "https://example.com/privacy")!)
            }
            .font(.caption)
        }
    }

    private func purchase() async {
        guard let product = selectedProduct else { return }
        isPurchasing = true
        defer { isPurchasing = false }

        do {
            if let _ = try await store.purchase(product) {
                dismiss()
            }
        } catch {
            store.errorMessage = error.localizedDescription
            showError = true
        }
    }
}

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
                Text(title).font(.headline)
                Text(description).font(.subheadline).foregroundStyle(.secondary)
            }
        }
    }
}

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
                        Text(product.displayName).font(.headline)
                        if let savings = savingsPercentage, savings > 0 {
                            Text("Save \(savings)%")
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
                    Text(product.id.contains("monthly") ? "/month" : "/year")
                        .font(.caption)
                        .foregroundStyle(.secondary)
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

// Color extension for hex colors
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default: (a, r, g, b) = (1, 1, 1, 0)
        }
        self.init(.sRGB, red: Double(r) / 255, green: Double(g) / 255, blue: Double(b) / 255, opacity: Double(a) / 255)
    }
}
```

### Step 3: Create Localizable.strings Files

Create these directories and files:

```
ios-native/Sources/Resources/
├── en.lproj/
│   └── Localizable.strings
└── zh-HK.lproj/
    └── Localizable.strings
```

**File: `ios-native/Sources/Resources/en.lproj/Localizable.strings`**

```
/* Subscription */
"subscription.premium" = "Premium";
"subscription.tagline" = "Unlock personalized recommendations";
"subscription.features.memory" = "Personalized recommendations";
"subscription.features.memoryDescription" = "The AI learns your preferences over time";
"subscription.features.betterModel" = "Enhanced AI responses";
"subscription.features.betterModelDescription" = "Access to our most capable AI model";
"subscription.features.priority" = "Priority processing";
"subscription.features.priorityDescription" = "Faster response times";
"subscription.subscribe" = "Subscribe";
"subscription.restore" = "Restore Purchase";

/* Common */
"itinerary.openNow" = "Open now";
"itinerary.closed" = "Closed";
"itinerary.export" = "Export to Calendar";
```

**File: `ios-native/Sources/Resources/zh-HK.lproj/Localizable.strings`**

```
/* Subscription */
"subscription.premium" = "高級版";
"subscription.tagline" = "解鎖個人化推薦功能";
"subscription.features.memory" = "個人化推薦";
"subscription.features.memoryDescription" = "AI會學習你的偏好";
"subscription.features.betterModel" = "進階AI回應";
"subscription.features.betterModelDescription" = "使用最強大的AI模型";
"subscription.features.priority" = "優先處理";
"subscription.features.priorityDescription" = "更快的回應速度";
"subscription.subscribe" = "訂閱";
"subscription.restore" = "恢復購買";

/* Common */
"itinerary.openNow" = "營業中";
"itinerary.closed" = "已關閉";
"itinerary.export" = "匯出至日曆";
```

---

## Android Native (Kotlin + Google Play Billing)

### Step 1: Add Billing Dependency

**File: `android-native/app/build.gradle.kts`**

Add to dependencies:

```kotlin
dependencies {
    // ... existing dependencies

    // Google Play Billing
    implementation("com.android.billingclient:billing-ktx:6.1.0")
}
```

### Step 2: Create BillingManager

**File: `android-native/app/src/main/java/com/londondayplanner/app/billing/BillingManager.kt`**

```kotlin
package com.londondayplanner.app.billing

import android.app.Activity
import android.content.Context
import android.util.Log
import com.android.billingclient.api.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

object SubscriptionProducts {
    const val MONTHLY = "premium_monthly"
    const val ANNUAL = "premium_annual"
    val allProducts = listOf(MONTHLY, ANNUAL)
}

class BillingManager(private val context: Context) {

    companion object {
        private const val TAG = "BillingManager"

        @Volatile
        private var INSTANCE: BillingManager? = null

        fun getInstance(context: Context): BillingManager {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: BillingManager(context.applicationContext).also { INSTANCE = it }
            }
        }
    }

    private val _products = MutableStateFlow<List<ProductDetails>>(emptyList())
    val products: StateFlow<List<ProductDetails>> = _products.asStateFlow()

    private val _isPremium = MutableStateFlow(false)
    val isPremium: StateFlow<Boolean> = _isPremium.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    private val billingClient: BillingClient

    private val purchasesUpdatedListener = PurchasesUpdatedListener { billingResult, purchases ->
        when (billingResult.responseCode) {
            BillingClient.BillingResponseCode.OK -> {
                purchases?.forEach { purchase -> handlePurchase(purchase) }
            }
            BillingClient.BillingResponseCode.USER_CANCELED -> {
                Log.d(TAG, "User cancelled the purchase")
            }
            else -> {
                Log.e(TAG, "Purchase failed: ${billingResult.debugMessage}")
                _errorMessage.value = "Purchase failed. Please try again."
            }
        }
        _isLoading.value = false
    }

    init {
        billingClient = BillingClient.newBuilder(context)
            .setListener(purchasesUpdatedListener)
            .enablePendingPurchases()
            .build()
    }

    fun connect() {
        if (billingClient.isReady) return

        billingClient.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(billingResult: BillingResult) {
                if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                    queryProducts()
                    queryPurchases()
                } else {
                    _errorMessage.value = "Failed to connect to Google Play."
                }
            }

            override fun onBillingServiceDisconnected() {
                Log.w(TAG, "BillingClient disconnected")
            }
        })
    }

    private fun queryProducts() {
        val productList = SubscriptionProducts.allProducts.map { productId ->
            QueryProductDetailsParams.Product.newBuilder()
                .setProductId(productId)
                .setProductType(BillingClient.ProductType.SUBS)
                .build()
        }

        val params = QueryProductDetailsParams.newBuilder()
            .setProductList(productList)
            .build()

        billingClient.queryProductDetailsAsync(params) { billingResult, productDetailsList ->
            if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                _products.value = productDetailsList.sortedBy {
                    it.subscriptionOfferDetails?.firstOrNull()
                        ?.pricingPhases?.pricingPhaseList?.firstOrNull()
                        ?.priceAmountMicros ?: Long.MAX_VALUE
                }
            }
        }
    }

    private fun queryPurchases() {
        val params = QueryPurchasesParams.newBuilder()
            .setProductType(BillingClient.ProductType.SUBS)
            .build()

        billingClient.queryPurchasesAsync(params) { billingResult, purchases ->
            if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                val hasPremium = purchases.any { purchase ->
                    purchase.purchaseState == Purchase.PurchaseState.PURCHASED &&
                    purchase.products.any { it in SubscriptionProducts.allProducts }
                }
                _isPremium.value = hasPremium

                // Acknowledge unacknowledged purchases
                purchases.filter { !it.isAcknowledged && it.purchaseState == Purchase.PurchaseState.PURCHASED }
                    .forEach { acknowledgePurchase(it) }
            }
        }
    }

    fun launchPurchaseFlow(activity: Activity, productDetails: ProductDetails) {
        val offerToken = productDetails.subscriptionOfferDetails?.firstOrNull()?.offerToken
        if (offerToken == null) {
            _errorMessage.value = "Unable to start purchase."
            return
        }

        _isLoading.value = true

        val productDetailsParams = BillingFlowParams.ProductDetailsParams.newBuilder()
            .setProductDetails(productDetails)
            .setOfferToken(offerToken)
            .build()

        val billingFlowParams = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(listOf(productDetailsParams))
            .build()

        val result = billingClient.launchBillingFlow(activity, billingFlowParams)
        if (result.responseCode != BillingClient.BillingResponseCode.OK) {
            _errorMessage.value = "Failed to start purchase."
            _isLoading.value = false
        }
    }

    private fun handlePurchase(purchase: Purchase) {
        if (purchase.purchaseState == Purchase.PurchaseState.PURCHASED) {
            if (!purchase.isAcknowledged) {
                acknowledgePurchase(purchase)
            }
            if (purchase.products.any { it in SubscriptionProducts.allProducts }) {
                _isPremium.value = true
            }
        }
    }

    private fun acknowledgePurchase(purchase: Purchase) {
        val params = AcknowledgePurchaseParams.newBuilder()
            .setPurchaseToken(purchase.purchaseToken)
            .build()

        billingClient.acknowledgePurchase(params) { /* handled */ }
    }

    fun restorePurchases() {
        _isLoading.value = true
        queryPurchases()
        _isLoading.value = false
    }

    fun clearError() {
        _errorMessage.value = null
    }

    fun getAnnualSavingsPercentage(): Int {
        val monthly = _products.value.find { it.productId == SubscriptionProducts.MONTHLY }
        val annual = _products.value.find { it.productId == SubscriptionProducts.ANNUAL }

        if (monthly == null || annual == null) return 0

        val monthlyPrice = monthly.subscriptionOfferDetails?.firstOrNull()
            ?.pricingPhases?.pricingPhaseList?.firstOrNull()
            ?.priceAmountMicros ?: return 0

        val annualPrice = annual.subscriptionOfferDetails?.firstOrNull()
            ?.pricingPhases?.pricingPhaseList?.firstOrNull()
            ?.priceAmountMicros ?: return 0

        val monthlyAnnualized = monthlyPrice * 12
        return ((monthlyAnnualized - annualPrice).toDouble() / monthlyAnnualized * 100).toInt()
    }

    fun endConnection() {
        billingClient.endConnection()
    }
}
```

### Step 3: Create String Resources

**File: `android-native/app/src/main/res/values/strings.xml`**

```xml
<resources>
    <string name="app_name">Plan Your Perfect Day</string>

    <!-- Subscription -->
    <string name="subscription_premium">Premium</string>
    <string name="subscription_tagline">Unlock personalized recommendations</string>
    <string name="subscription_features_memory">Personalized recommendations</string>
    <string name="subscription_features_memory_description">The AI learns your preferences over time</string>
    <string name="subscription_features_better_model">Enhanced AI responses</string>
    <string name="subscription_features_better_model_description">Access to our most capable AI model</string>
    <string name="subscription_features_priority">Priority processing</string>
    <string name="subscription_features_priority_description">Faster response times</string>
    <string name="subscription_subscribe">Subscribe</string>
    <string name="subscription_restore">Restore Purchase</string>

    <!-- Common -->
    <string name="itinerary_open_now">Open now</string>
    <string name="itinerary_closed">Closed</string>
    <string name="itinerary_export">Export to Calendar</string>
</resources>
```

**File: `android-native/app/src/main/res/values-zh-rHK/strings.xml`**

Create directory `values-zh-rHK` first:

```xml
<resources>
    <string name="app_name">計劃你的完美一天</string>

    <!-- Subscription -->
    <string name="subscription_premium">高級版</string>
    <string name="subscription_tagline">解鎖個人化推薦功能</string>
    <string name="subscription_features_memory">個人化推薦</string>
    <string name="subscription_features_memory_description">AI會學習你的偏好</string>
    <string name="subscription_features_better_model">進階AI回應</string>
    <string name="subscription_features_better_model_description">使用最強大的AI模型</string>
    <string name="subscription_features_priority">優先處理</string>
    <string name="subscription_features_priority_description">更快的回應速度</string>
    <string name="subscription_subscribe">訂閱</string>
    <string name="subscription_restore">恢復購買</string>

    <!-- Common -->
    <string name="itinerary_open_now">營業中</string>
    <string name="itinerary_closed">已關閉</string>
    <string name="itinerary_export">匯出至日曆</string>
</resources>
```

---

## Backend (TypeScript)

### UserPreferencesService

**File: `server/services/UserPreferencesService.ts`**

```typescript
export interface UserPreferences {
  userId: string;
  isPremium: boolean;
  subscriptionTier: 'free' | 'monthly' | 'annual';
  subscriptionExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  preferences: {
    favoriteNeighborhoods: string[];
    cuisinePreferences: string[];
    ambiencePreferences: ('quiet' | 'lively' | 'cozy' | 'upscale' | 'casual')[];
    avoidCategories: string[];
    typicalBudget: 'budget' | 'moderate' | 'expensive' | 'luxury';
  };

  history: {
    likedVenues: VenueInteraction[];
    dislikedVenues: VenueInteraction[];
    searchHistory: SearchHistoryItem[];
    visitedCities: string[];
  };

  settings: {
    language: string;
    defaultCity: string;
    weatherAwareEnabled: boolean;
  };
}

export interface VenueInteraction {
  venueId: string;
  venueName: string;
  categories: string[];
  neighborhood: string;
  city: string;
  interactedAt: Date;
}

export interface SearchHistoryItem {
  query: string;
  city: string;
  tier: 'simple' | 'detailed' | 'complex';
  timestamp: Date;
}

// In-memory store (replace with database in production)
const userPreferencesStore = new Map<string, UserPreferences>();

export class UserPreferencesService {
  async getPreferences(userId: string): Promise<UserPreferences | null> {
    return userPreferencesStore.get(userId) || null;
  }

  async savePreferences(preferences: UserPreferences): Promise<void> {
    preferences.updatedAt = new Date();
    userPreferencesStore.set(preferences.userId, preferences);
  }

  async createDefaultPreferences(userId: string): Promise<UserPreferences> {
    const defaultPrefs: UserPreferences = {
      userId,
      isPremium: false,
      subscriptionTier: 'free',
      createdAt: new Date(),
      updatedAt: new Date(),
      preferences: {
        favoriteNeighborhoods: [],
        cuisinePreferences: [],
        ambiencePreferences: [],
        avoidCategories: [],
        typicalBudget: 'moderate',
      },
      history: {
        likedVenues: [],
        dislikedVenues: [],
        searchHistory: [],
        visitedCities: [],
      },
      settings: {
        language: 'en',
        defaultCity: 'london',
        weatherAwareEnabled: true,
      },
    };

    await this.savePreferences(defaultPrefs);
    return defaultPrefs;
  }

  async recordVenueInteraction(
    userId: string,
    venue: Omit<VenueInteraction, 'interactedAt'>,
    liked: boolean
  ): Promise<void> {
    const prefs = await this.getPreferences(userId);
    if (!prefs) return;

    const interaction: VenueInteraction = {
      ...venue,
      interactedAt: new Date(),
    };

    if (liked) {
      prefs.history.likedVenues = [interaction, ...prefs.history.likedVenues].slice(0, 100);
      prefs.history.dislikedVenues = prefs.history.dislikedVenues.filter(
        v => v.venueId !== venue.venueId
      );
    } else {
      prefs.history.dislikedVenues = [interaction, ...prefs.history.dislikedVenues].slice(0, 100);
      prefs.history.likedVenues = prefs.history.likedVenues.filter(
        v => v.venueId !== venue.venueId
      );
    }

    await this.savePreferences(prefs);
  }

  async getEnhancedPrompt(userId: string, basePrompt: string): Promise<string> {
    const prefs = await this.getPreferences(userId);
    if (!prefs?.isPremium) return basePrompt;

    const parts: string[] = [];

    if (prefs.preferences.favoriteNeighborhoods.length > 0) {
      parts.push(`- Favorite areas: ${prefs.preferences.favoriteNeighborhoods.slice(0, 5).join(', ')}`);
    }
    if (prefs.preferences.cuisinePreferences.length > 0) {
      parts.push(`- Cuisine preferences: ${prefs.preferences.cuisinePreferences.slice(0, 5).join(', ')}`);
    }
    if (prefs.preferences.ambiencePreferences.length > 0) {
      parts.push(`- Preferred ambience: ${prefs.preferences.ambiencePreferences.join(', ')}`);
    }

    const recentLikes = prefs.history.likedVenues.slice(0, 5);
    if (recentLikes.length > 0) {
      parts.push(`- Recently enjoyed: ${recentLikes.map(v => v.venueName).join(', ')}`);
    }

    if (prefs.preferences.avoidCategories.length > 0) {
      parts.push(`- Prefers to avoid: ${prefs.preferences.avoidCategories.join(', ')}`);
    }

    if (parts.length === 0) return basePrompt;

    return `${basePrompt}

USER PREFERENCES (personalize recommendations):
${parts.join('\n')}`;
  }

  getModelForUser(
    classification: { model: string },
    isPremium: boolean
  ): string {
    if (isPremium) {
      return 'gemini-1.5-pro'; // Premium always gets Pro
    }
    return classification.model; // Free gets model based on query complexity
  }
}

export const userPreferencesService = new UserPreferencesService();
```

---

## App Store Setup

### iOS App Store Connect

1. **Create App** in App Store Connect
2. **Go to Monetization > Subscriptions**
3. **Create Subscription Group** named "Premium"
4. **Add Products**:
   - `com.londonplanner.premium.monthly` - $8/month
   - `com.londonplanner.premium.annual` - $60/year
5. **Configure regional pricing** for UK (£6.50/£48) and HK (HK$62/HK$468)
6. **Set up App Store Server Notifications** webhook URL

### Google Play Console

1. **Create App** in Google Play Console
2. **Go to Monetization > Subscriptions**
3. **Create Products**:
   - `premium_monthly` - $8/month
   - `premium_annual` - $60/year
4. **Configure regional pricing** for UK and HK
5. **Set up Real-time Developer Notifications** Pub/Sub topic

---

## Testing

### Web
1. Change language via LanguageSwitcher
2. Verify all text updates correctly
3. Test Hong Kong-specific prompts in Chinese

### iOS Sandbox Testing
1. Create sandbox test account in App Store Connect
2. Sign out of App Store, sign in with sandbox account
3. Test purchase flow
4. Test restore purchases

### Android Testing
1. Add test account to license testing in Play Console
2. Use test card numbers
3. Test purchase flow
4. Test subscription restoration

---

## Files Created/Modified Summary

### Web Client
- `client/src/i18n/index.ts` (new)
- `client/src/i18n/locales/en/translation.json` (new)
- `client/src/i18n/locales/zh-HK/translation.json` (new)
- `client/src/components/LanguageSwitcher.tsx` (new)
- `client/src/main.tsx` (modified - added i18n import)
- `client/src/components/InputScreen.tsx` (modified - added translations)
- `client/src/components/ItineraryScreen.tsx` (modified - added translations)
- `client/src/components/ExamplePrompts.tsx` (modified - added translations)
- `client/src/data/cities.ts` (modified - added Hong Kong)

### iOS
- `ios-native/Sources/Services/StoreManager.swift` (new)
- `ios-native/Sources/Views/SubscriptionView.swift` (new)
- `ios-native/Sources/Resources/en.lproj/Localizable.strings` (new)
- `ios-native/Sources/Resources/zh-HK.lproj/Localizable.strings` (new)

### Android
- `android-native/app/build.gradle.kts` (modified - added billing dependency)
- `android-native/app/src/main/java/.../billing/BillingManager.kt` (new)
- `android-native/app/src/main/java/.../ui/screens/SubscriptionScreen.kt` (new)
- `android-native/app/src/main/res/values/strings.xml` (modified)
- `android-native/app/src/main/res/values-zh-rHK/strings.xml` (new)

### Backend
- `server/services/UserPreferencesService.ts` (new)
- `server/config/cities.ts` (modified - added Hong Kong)
