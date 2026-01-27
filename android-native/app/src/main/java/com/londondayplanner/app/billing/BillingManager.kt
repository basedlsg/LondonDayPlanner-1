package com.londondayplanner.app.billing

import android.app.Activity
import android.content.Context
import android.util.Log
import com.android.billingclient.api.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Subscription product identifiers
 */
object SubscriptionProducts {
    const val MONTHLY = "premium_monthly"
    const val ANNUAL = "premium_annual"

    val allProducts = listOf(MONTHLY, ANNUAL)
}

/**
 * Manages Google Play Billing for subscriptions
 */
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

    // State flows for reactive UI updates
    private val _products = MutableStateFlow<List<ProductDetails>>(emptyList())
    val products: StateFlow<List<ProductDetails>> = _products.asStateFlow()

    private val _isPremium = MutableStateFlow(false)
    val isPremium: StateFlow<Boolean> = _isPremium.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    // Billing client
    private val billingClient: BillingClient

    // Purchase update listener
    private val purchasesUpdatedListener = PurchasesUpdatedListener { billingResult, purchases ->
        when (billingResult.responseCode) {
            BillingClient.BillingResponseCode.OK -> {
                purchases?.forEach { purchase ->
                    handlePurchase(purchase)
                }
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

    /**
     * Connect to Google Play Billing service
     */
    fun connect() {
        if (billingClient.isReady) {
            Log.d(TAG, "BillingClient already connected")
            return
        }

        billingClient.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(billingResult: BillingResult) {
                if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                    Log.d(TAG, "BillingClient connected successfully")
                    queryProducts()
                    queryPurchases()
                } else {
                    Log.e(TAG, "BillingClient connection failed: ${billingResult.debugMessage}")
                    _errorMessage.value = "Failed to connect to Google Play. Please try again."
                }
            }

            override fun onBillingServiceDisconnected() {
                Log.w(TAG, "BillingClient disconnected, will retry on next operation")
            }
        })
    }

    /**
     * Query available subscription products
     */
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
                Log.d(TAG, "Loaded ${productDetailsList.size} products")
                _products.value = productDetailsList.sortedBy {
                    it.subscriptionOfferDetails?.firstOrNull()?.pricingPhases?.pricingPhaseList?.firstOrNull()?.priceAmountMicros ?: Long.MAX_VALUE
                }
            } else {
                Log.e(TAG, "Failed to query products: ${billingResult.debugMessage}")
            }
        }
    }

    /**
     * Query existing purchases to restore premium status
     */
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
                Log.d(TAG, "Premium status: $hasPremium")

                // Acknowledge any unacknowledged purchases
                purchases.filter { !it.isAcknowledged && it.purchaseState == Purchase.PurchaseState.PURCHASED }
                    .forEach { purchase -> acknowledgePurchase(purchase) }
            } else {
                Log.e(TAG, "Failed to query purchases: ${billingResult.debugMessage}")
            }
        }
    }

    /**
     * Launch the purchase flow for a product
     */
    fun launchPurchaseFlow(activity: Activity, productDetails: ProductDetails) {
        val offerToken = productDetails.subscriptionOfferDetails?.firstOrNull()?.offerToken
        if (offerToken == null) {
            Log.e(TAG, "No offer token found for product")
            _errorMessage.value = "Unable to start purchase. Please try again."
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
            Log.e(TAG, "Failed to launch billing flow: ${result.debugMessage}")
            _errorMessage.value = "Failed to start purchase. Please try again."
            _isLoading.value = false
        }
    }

    /**
     * Handle a completed purchase
     */
    private fun handlePurchase(purchase: Purchase) {
        if (purchase.purchaseState == Purchase.PurchaseState.PURCHASED) {
            Log.d(TAG, "Purchase successful: ${purchase.products}")

            // Acknowledge the purchase if not already acknowledged
            if (!purchase.isAcknowledged) {
                acknowledgePurchase(purchase)
            }

            // Update premium status
            if (purchase.products.any { it in SubscriptionProducts.allProducts }) {
                _isPremium.value = true
            }
        } else if (purchase.purchaseState == Purchase.PurchaseState.PENDING) {
            Log.d(TAG, "Purchase pending: ${purchase.products}")
            _errorMessage.value = "Purchase is pending. Please complete the transaction."
        }
    }

    /**
     * Acknowledge a purchase to prevent refund
     */
    private fun acknowledgePurchase(purchase: Purchase) {
        val params = AcknowledgePurchaseParams.newBuilder()
            .setPurchaseToken(purchase.purchaseToken)
            .build()

        billingClient.acknowledgePurchase(params) { billingResult ->
            if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                Log.d(TAG, "Purchase acknowledged: ${purchase.products}")
            } else {
                Log.e(TAG, "Failed to acknowledge purchase: ${billingResult.debugMessage}")
            }
        }
    }

    /**
     * Restore purchases
     */
    fun restorePurchases() {
        _isLoading.value = true
        queryPurchases()
        _isLoading.value = false
    }

    /**
     * Clear error message
     */
    fun clearError() {
        _errorMessage.value = null
    }

    /**
     * Get the monthly product
     */
    fun getMonthlyProduct(): ProductDetails? {
        return _products.value.find { it.productId == SubscriptionProducts.MONTHLY }
    }

    /**
     * Get the annual product
     */
    fun getAnnualProduct(): ProductDetails? {
        return _products.value.find { it.productId == SubscriptionProducts.ANNUAL }
    }

    /**
     * Calculate annual savings percentage compared to monthly
     */
    fun getAnnualSavingsPercentage(): Int {
        val monthly = getMonthlyProduct()
        val annual = getAnnualProduct()

        if (monthly == null || annual == null) return 0

        val monthlyPrice = monthly.subscriptionOfferDetails?.firstOrNull()
            ?.pricingPhases?.pricingPhaseList?.firstOrNull()
            ?.priceAmountMicros ?: return 0

        val annualPrice = annual.subscriptionOfferDetails?.firstOrNull()
            ?.pricingPhases?.pricingPhaseList?.firstOrNull()
            ?.priceAmountMicros ?: return 0

        val monthlyAnnualized = monthlyPrice * 12
        val savings = ((monthlyAnnualized - annualPrice).toDouble() / monthlyAnnualized * 100).toInt()

        return savings
    }

    /**
     * End the billing connection when no longer needed
     */
    fun endConnection() {
        billingClient.endConnection()
    }
}
