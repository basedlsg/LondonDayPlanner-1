package com.londondayplanner.app.ui.screens

import android.app.Activity
import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.android.billingclient.api.ProductDetails
import com.londondayplanner.app.R
import com.londondayplanner.app.billing.BillingManager
import com.londondayplanner.app.billing.SubscriptionProducts

// App colors
private val PrimaryBlue = Color(0xFF17B9E6)
private val DarkBlue = Color(0xFF1D8BC4)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SubscriptionScreen(
    billingManager: BillingManager,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val activity = context as? Activity

    val products by billingManager.products.collectAsState()
    val isLoading by billingManager.isLoading.collectAsState()
    val errorMessage by billingManager.errorMessage.collectAsState()

    var selectedProduct by remember { mutableStateOf<ProductDetails?>(null) }

    // Select annual by default
    LaunchedEffect(products) {
        if (selectedProduct == null && products.isNotEmpty()) {
            selectedProduct = billingManager.getAnnualProduct() ?: products.firstOrNull()
        }
    }

    // Show error snackbar
    val snackbarHostState = remember { SnackbarHostState() }
    LaunchedEffect(errorMessage) {
        errorMessage?.let {
            snackbarHostState.showSnackbar(it)
            billingManager.clearError()
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { },
                actions = {
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Close")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color.Transparent
                )
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Header
            HeaderSection()

            Spacer(modifier = Modifier.height(32.dp))

            // Features
            FeaturesSection()

            Spacer(modifier = Modifier.height(32.dp))

            // Pricing Options
            PricingSection(
                products = products,
                selectedProduct = selectedProduct,
                savingsPercentage = billingManager.getAnnualSavingsPercentage(),
                onProductSelected = { selectedProduct = it }
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Subscribe Button
            Button(
                onClick = {
                    selectedProduct?.let { product ->
                        activity?.let { billingManager.launchPurchaseFlow(it, product) }
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                enabled = selectedProduct != null && !isLoading,
                colors = ButtonDefaults.buttonColors(
                    containerColor = PrimaryBlue
                ),
                shape = RoundedCornerShape(14.dp)
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        color = Color.White,
                        strokeWidth = 2.dp
                    )
                } else {
                    Text(
                        text = stringResource(R.string.subscription_subscribe),
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 16.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Restore Purchases
            TextButton(
                onClick = { billingManager.restorePurchases() },
                enabled = !isLoading
            ) {
                Text(
                    text = stringResource(R.string.subscription_restore),
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Legal
            LegalSection()
        }
    }
}

@Composable
private fun HeaderSection() {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Premium badge
        Surface(
            shape = RoundedCornerShape(50),
            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    Icons.Default.Star,
                    contentDescription = null,
                    tint = Color(0xFFFFD700)
                )
                Text(
                    text = stringResource(R.string.subscription_premium),
                    fontWeight = FontWeight.SemiBold
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = stringResource(R.string.subscription_tagline),
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center
        )
    }
}

@Composable
private fun FeaturesSection() {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            FeatureRow(
                icon = "brain",
                iconColor = Color(0xFF9C27B0),
                title = stringResource(R.string.subscription_features_memory),
                description = stringResource(R.string.subscription_features_memory_description)
            )

            FeatureRow(
                icon = "sparkles",
                iconColor = Color(0xFFFF9800),
                title = stringResource(R.string.subscription_features_better_model),
                description = stringResource(R.string.subscription_features_better_model_description)
            )

            FeatureRow(
                icon = "bolt",
                iconColor = PrimaryBlue,
                title = stringResource(R.string.subscription_features_priority),
                description = stringResource(R.string.subscription_features_priority_description)
            )
        }
    }
}

@Composable
private fun FeatureRow(
    icon: String,
    iconColor: Color,
    title: String,
    description: String
) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Icon placeholder - using emoji for simplicity
        val emoji = when (icon) {
            "brain" -> "\uD83E\uDDE0"
            "sparkles" -> "\u2728"
            "bolt" -> "\u26A1"
            else -> "\u2B50"
        }
        Text(
            text = emoji,
            fontSize = 24.sp,
            modifier = Modifier.width(32.dp)
        )

        Column {
            Text(
                text = title,
                fontWeight = FontWeight.SemiBold,
                fontSize = 16.sp
            )
            Text(
                text = description,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontSize = 14.sp
            )
        }
    }
}

@Composable
private fun PricingSection(
    products: List<ProductDetails>,
    selectedProduct: ProductDetails?,
    savingsPercentage: Int,
    onProductSelected: (ProductDetails) -> Unit
) {
    Column(
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        products.forEach { product ->
            ProductCard(
                product = product,
                isSelected = selectedProduct?.productId == product.productId,
                savingsPercentage = if (product.productId == SubscriptionProducts.ANNUAL) savingsPercentage else null,
                onClick = { onProductSelected(product) }
            )
        }
    }
}

@Composable
private fun ProductCard(
    product: ProductDetails,
    isSelected: Boolean,
    savingsPercentage: Int?,
    onClick: () -> Unit
) {
    val borderColor by animateColorAsState(
        if (isSelected) PrimaryBlue else MaterialTheme.colorScheme.outline.copy(alpha = 0.3f),
        label = "borderColor"
    )

    val backgroundColor by animateColorAsState(
        if (isSelected) PrimaryBlue.copy(alpha = 0.1f) else Color.Transparent,
        label = "backgroundColor"
    )

    val priceInfo = product.subscriptionOfferDetails?.firstOrNull()
        ?.pricingPhases?.pricingPhaseList?.firstOrNull()

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(12.dp),
        color = backgroundColor,
        border = BorderStroke(
            width = if (isSelected) 2.dp else 1.dp,
            color = borderColor
        )
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Selection indicator
            Box(
                modifier = Modifier
                    .size(24.dp)
                    .clip(CircleShape)
                    .background(
                        if (isSelected) PrimaryBlue else Color.Transparent,
                        CircleShape
                    )
                    .then(
                        if (!isSelected) Modifier.background(
                            Color.Transparent,
                            CircleShape
                        ) else Modifier
                    ),
                contentAlignment = Alignment.Center
            ) {
                Box(
                    modifier = Modifier
                        .size(24.dp)
                        .clip(CircleShape)
                        .background(
                            Color.Transparent,
                            CircleShape
                        )
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .clip(CircleShape)
                            .background(
                                if (isSelected) Color.Transparent else Color.Transparent,
                                CircleShape
                            )
                    )
                }
                if (isSelected) {
                    Box(
                        modifier = Modifier
                            .size(12.dp)
                            .clip(CircleShape)
                            .background(Color.White, CircleShape)
                    )
                } else {
                    Box(
                        modifier = Modifier
                            .size(22.dp)
                            .clip(CircleShape)
                            .background(Color.Transparent, CircleShape)
                    ) {
                        // Empty circle outline
                    }
                }
            }

            Spacer(modifier = Modifier.width(16.dp))

            Column(modifier = Modifier.weight(1f)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = product.name,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 16.sp
                    )

                    if (savingsPercentage != null && savingsPercentage > 0) {
                        Surface(
                            shape = RoundedCornerShape(50),
                            color = Color(0xFF4CAF50)
                        ) {
                            Text(
                                text = "Save $savingsPercentage%",
                                color = Color.White,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                            )
                        }
                    }
                }

                Text(
                    text = product.description,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontSize = 14.sp
                )
            }

            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = priceInfo?.formattedPrice ?: "",
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp
                )
                Text(
                    text = if (product.productId.contains("monthly")) "/month" else "/year",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontSize = 12.sp
                )
            }
        }
    }
}

@Composable
private fun LegalSection() {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "Subscriptions auto-renew unless cancelled at least 24 hours before the end of the current period.",
            textAlign = TextAlign.Center,
            fontSize = 12.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(8.dp))

        Row(
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            TextButton(onClick = { /* Open terms */ }) {
                Text(
                    text = "Terms of Use",
                    fontSize = 12.sp
                )
            }
            TextButton(onClick = { /* Open privacy */ }) {
                Text(
                    text = "Privacy Policy",
                    fontSize = 12.sp
                )
            }
        }
    }
}
