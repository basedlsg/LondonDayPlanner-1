package com.londondayplanner.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.londondayplanner.app.R
import com.londondayplanner.app.billing.BillingManager

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    billingManager: BillingManager,
    onBack: () -> Unit,
    onSubscriptionClick: () -> Unit
) {
    val isPremium by billingManager.isPremium.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.settings_title)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = stringResource(R.string.common_back))
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background
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
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            // Account Section
            SettingsSection(title = "Account") {
                // User Profile (Mock)
                SettingsItem(
                    icon = Icons.Default.Person,
                    title = "Sign In",
                    subtitle = "Sync your trips across devices",
                    onClick = { /* TODO: Auth */ }
                )

                Divider(modifier = Modifier.padding(horizontal = 16.dp))

                // Subscription
                SettingsItem(
                    icon = Icons.Default.Star,
                    iconTint = Color(0xFFFFD700),
                    title = stringResource(R.string.settings_subscription),
                    subtitle = if (isPremium) stringResource(R.string.subscription_active) else stringResource(R.string.settings_manage_subscription),
                    trailing = {
                        if (isPremium) {
                            Surface(
                                color = Color(0xFF4CAF50),
                                shape = RoundedCornerShape(50),
                                modifier = Modifier.padding(end = 8.dp)
                            ) {
                                Text(
                                    text = "PRO",
                                    color = Color.White,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                                )
                            }
                        }
                    },
                    onClick = onSubscriptionClick
                )
            }

            // Preferences
            SettingsSection(title = "Preferences") {
                SettingsItem(
                    title = stringResource(R.string.settings_city),
                    subtitle = "London",
                    onClick = { /* TODO */ }
                )
                Divider(modifier = Modifier.padding(horizontal = 16.dp))
                SettingsItem(
                    title = stringResource(R.string.settings_language),
                    subtitle = "English", // In real app, derived from locale
                    onClick = { /* TODO */ }
                )
            }

            // About
            SettingsSection(title = stringResource(R.string.settings_about)) {
                SettingsItem(
                    title = stringResource(R.string.settings_version, "1.0.0"),
                    showChevron = false,
                    onClick = {}
                )
            }
        }
    }
}

@Composable
fun SettingsSection(
    title: String,
    content: @Composable ColumnScope.() -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            text = title,
            fontSize = 14.sp,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.primary,
            modifier = Modifier.padding(start = 8.dp)
        )
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
        ) {
            Column {
                content()
            }
        }
    }
}

@Composable
fun SettingsItem(
    title: String,
    subtitle: String? = null,
    icon: ImageVector? = null,
    iconTint: Color = MaterialTheme.colorScheme.primary,
    showChevron: Boolean = true,
    trailing: (@Composable () -> Unit)? = null,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (icon != null) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = iconTint,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.width(16.dp))
        }

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                fontSize = 16.sp,
                fontWeight = FontWeight.Medium
            )
            if (subtitle != null) {
                Text(
                    text = subtitle,
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        if (trailing != null) {
            trailing()
        }

        if (showChevron) {
            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
            )
        }
    }
}
