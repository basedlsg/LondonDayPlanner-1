package com.londondayplanner.app.ui.screens

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.londondayplanner.app.model.Itinerary
import com.londondayplanner.app.ui.components.LiquidBackground
import com.londondayplanner.app.ui.components.VenueCard

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ItineraryScreen(
    itinerary: Itinerary,
    onBack: () -> Unit,
    onPlaceClick: (String) -> Unit,
    onMapClick: () -> Unit,
    onShareClick: () -> Unit
) {
    Box(modifier = Modifier.fillMaxSize()) {
        LiquidBackground()

        Column(modifier = Modifier.fillMaxSize()) {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = itinerary.title,
                            color = Color.White,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = itinerary.date,
                            style = androidx.compose.material3.MaterialTheme.typography.bodySmall,
                            color = Color.White.copy(alpha = 0.7f)
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color.White)
                    }
                },
                actions = {
                    IconButton(onClick = onMapClick) {
                        Icon(Icons.Default.Place, contentDescription = "Map", tint = Color.White)
                    }
                    IconButton(onClick = onShareClick) {
                        Icon(Icons.Default.Share, contentDescription = "Share", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color.Transparent
                )
            )

            LazyColumn(
                contentPadding = PaddingValues(16.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(itinerary.places) { place ->
                    VenueCard(
                        place = place,
                        onClick = { onPlaceClick(place.id) }
                    )
                }
                
                item {
                    Spacer(modifier = Modifier.height(32.dp))
                }
            }
        }
    }
}
