package com.londondayplanner.app.ui.screens

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.GoogleMap
import com.google.maps.android.compose.Marker
import com.google.maps.android.compose.MarkerState
import com.google.maps.android.compose.rememberCameraPositionState
import com.londondayplanner.app.model.Itinerary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MapScreen(
    itinerary: Itinerary,
    onBack: () -> Unit
) {
    // Center map on the first place or default to London
    val firstLocation = itinerary.places.firstOrNull()?.coordinates
    val startPos = LatLng(firstLocation?.lat ?: 51.5074, firstLocation?.lng ?: -0.1278)

    val cameraPositionState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(startPos, 13f)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(itinerary.title, color = Color.White) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF0F0F1A).copy(alpha = 0.8f)
                )
            )
        }
    ) { padding ->
        Box(modifier = Modifier.padding(padding).fillMaxSize()) {
            GoogleMap(
                modifier = Modifier.fillMaxSize(),
                cameraPositionState = cameraPositionState
            ) {
                itinerary.places.forEach { place ->
                    Marker(
                        state = MarkerState(position = LatLng(place.coordinates.lat, place.coordinates.lng)),
                        title = place.name,
                        snippet = place.time
                    )
                }
            }
        }
    }
}
