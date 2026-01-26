package com.londondayplanner.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import com.londondayplanner.app.ui.theme.LondonDayPlannerTheme

class MainActivity : ComponentActivity() {
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.londondayplanner.app.model.Itinerary
import com.londondayplanner.app.model.Location
import com.londondayplanner.app.model.ScheduledPlace
import com.londondayplanner.app.ui.screens.HomeScreen
import com.londondayplanner.app.ui.screens.ItineraryScreen
import com.londondayplanner.app.ui.screens.MapScreen
import com.londondayplanner.app.ui.theme.LondonDayPlannerTheme
import com.londondayplanner.app.util.ShareUtils

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            LondonDayPlannerTheme {
                val navController = rememberNavController()
                
                NavHost(navController = navController, startDestination = "home") {
                    composable("home") {
                        HomeScreen(
                            onPlanDay = { query ->
                                // For MVP demo, navigate directly to a mock itinerary
                                // Real app would make API call here or in ViewModel
                                navController.navigate("itinerary/mock_id")
                            }
                        )
                    }
                    
                    composable("itinerary/{id}") { backStackEntry ->
                        val itineraryId = backStackEntry.arguments?.getString("id")
                        // Mock data for demo
                        val mockItinerary = Itinerary(
                            id = "1",
                            title = "Perfect Day in London",
                            city = "london",
                            date = "Oct 24, 2026",
                            places = listOf(
                                ScheduledPlace(
                                    id = "p1",
                                    name = "Monmouth Coffee",
                                    description = "Artisanal coffee in Covent Garden.",
                                    address = "27 Monmouth St",
                                    time = "10:00 AM",
                                    durationMinutes = 45,
                                    coordinates = Location(51.5, -0.1),
                                    rating = 4.5
                                ),
                                ScheduledPlace(
                                    id = "p2",
                                    name = "British Museum",
                                    description = "World history and culture.",
                                    address = "Great Russell St",
                                    time = "11:00 AM",
                                    durationMinutes = 120,
                                    coordinates = Location(51.51, -0.12),
                                    rating = 4.8
                                ),
                                ScheduledPlace(
                                    id = "p3",
                                    name = "Dishoom",
                                    description = "Bombay cafe style lunch.",
                                    address = "12 Upper St. Martin's Ln",
                                    time = "1:30 PM",
                                    durationMinutes = 90,
                                    coordinates = Location(51.51, -0.12),
                                    rating = 4.7
                                )
                            )
                        )
                        
                        val context = LocalContext.current
                        
                        ItineraryScreen(
                            itinerary = mockItinerary,
                            onBack = { navController.popBackStack() },
                            onPlaceClick = { /* Navigate to details */ },
                            onMapClick = { navController.navigate("map/${mockItinerary.id}") },
                            onShareClick = { ShareUtils.shareItineraryText(context, mockItinerary) }
                        )
                    }
                    
                    composable("map/{id}") {
                        // In real app, fetch again or share ViewModel
                        val mockItinerary = Itinerary(
                            id = "1",
                            title = "Perfect Day in London",
                            city = "london",
                            date = "Oct 24, 2026",
                            places = listOf(
                                ScheduledPlace(
                                    id = "p1",
                                    name = "Monmouth Coffee",
                                    description = "Artisanal coffee in Covent Garden.",
                                    address = "27 Monmouth St",
                                    time = "10:00 AM",
                                    durationMinutes = 45,
                                    coordinates = Location(51.5, -0.1),
                                    rating = 4.5
                                ),
                                ScheduledPlace(
                                    id = "p2",
                                    name = "British Museum",
                                    description = "World history and culture.",
                                    address = "Great Russell St",
                                    time = "11:00 AM",
                                    durationMinutes = 120,
                                    coordinates = Location(51.51, -0.12),
                                    rating = 4.8
                                ),
                                ScheduledPlace(
                                    id = "p3",
                                    name = "Dishoom",
                                    description = "Bombay cafe style lunch.",
                                    address = "12 Upper St. Martin's Ln",
                                    time = "1:30 PM",
                                    durationMinutes = 90,
                                    coordinates = Location(51.51, -0.12),
                                    rating = 4.7
                                )
                            )
                        )
                        
                        MapScreen(
                            itinerary = mockItinerary,
                            onBack = { navController.popBackStack() }
                        )
                    }
                }
            }
        }
    }
}
